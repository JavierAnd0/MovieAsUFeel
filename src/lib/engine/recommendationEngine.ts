import { getMovieRecommendations, getSimilarMovies, getGenreList, tmdbMovieUrl } from "@/lib/tmdb/client";
import { fetchDiscoverCandidates } from "@/lib/tmdb/discover";
import { MOOD_MAP } from "@/lib/mood/moodMap";
import { analyzeText } from "@/lib/mood/textAnalyzer";
import type { TasteProfile } from "@/types/letterboxd";
import type { MoodInput, MoodSignal } from "@/types/mood";
import type { TMDBMovie } from "@/types/tmdb";
import type { RecommendedMovie, RecommendationsResponse } from "@/types/recommendation";

// ─── Mood helpers ────────────────────────────────────────────────────────────

function mergeMoodSignals(signals: MoodSignal[]): MoodSignal {
  if (signals.length === 1) return signals[0];
  return {
    genres: [...new Set(signals.flatMap((s) => s.genres))],
    keywords: [...new Set(signals.flatMap((s) => s.keywords))],
    sortBy: signals.some((s) => s.sortBy === "vote_average.desc")
      ? "vote_average.desc"
      : "popularity.desc",
    voteThreshold:
      Math.round(
        (signals.reduce((s, sig) => s + sig.voteThreshold, 0) / signals.length) * 10
      ) / 10,
    toneLabel: signals.map((s) => s.toneLabel).join(" / "),
  };
}

// ─── Candidate pool ───────────────────────────────────────────────────────────

type Candidate = TMDBMovie & { triggeredBy: string; appearances: number };

/**
 * Taste-first strategy: fetch TMDB recommendations for each of the user's
 * top-rated films. Films that appear in multiple lists score higher.
 */
async function buildTasteFirstPool(
  tasteProfile: TasteProfile
): Promise<Map<number, Candidate>> {
  const pool = new Map<number, Candidate>();

  const sources = tasteProfile.topRatedFilms;
  if (sources.length === 0) return pool;

  // Fetch recommendations for each top-rated film in parallel
  const recommendationResults = await Promise.all(
    sources.map((film) =>
      getMovieRecommendations(film.tmdbId).catch(() => null)
    )
  );

  // Also fetch similar movies for the single highest-rated film (extra diversity)
  const topFilm = sources[0];
  const similarResults = await getSimilarMovies(topFilm.tmdbId).catch(() => null);

  // Process recommendations
  sources.forEach((sourceFilm, i) => {
    const results = recommendationResults[i]?.results ?? [];
    for (const movie of results) {
      if (!movie.poster_path) continue; // skip entries without posters
      const existing = pool.get(movie.id);
      if (existing) {
        existing.appearances += 1;
        // Keep the triggeredBy of the highest-rated source
      } else {
        pool.set(movie.id, { ...movie, triggeredBy: sourceFilm.title, appearances: 1 });
      }
    }
  });

  // Add similar movies (triggeredBy the top film, appearances start at 0.5 weight)
  for (const movie of similarResults?.results ?? []) {
    if (!movie.poster_path) continue;
    const existing = pool.get(movie.id);
    if (existing) {
      existing.appearances += 0.5;
    } else {
      pool.set(movie.id, { ...movie, triggeredBy: topFilm.title, appearances: 0.5 });
    }
  }

  return pool;
}

/**
 * Fallback strategy when the user has fewer than 2 top-rated films with TMDB data.
 * Uses genre-based Discover (original approach).
 */
async function buildDiscoverFallbackPool(
  tasteProfile: TasteProfile,
  moodSignal: MoodSignal
): Promise<Map<number, Candidate>> {
  const pool = new Map<number, Candidate>();
  const tasteGenreIds = tasteProfile.topGenres.map((g) => g.id);
  const queryGenres = tasteGenreIds.slice(0, 3).length >= 1
    ? tasteGenreIds.slice(0, 3)
    : moodSignal.genres.slice(0, 3);

  const candidates = await fetchDiscoverCandidates({
    with_genres: queryGenres.join("|"),
    sort_by: moodSignal.sortBy,
    "vote_average.gte": moodSignal.voteThreshold,
    "vote_count.gte": 80,
  });

  for (const movie of candidates) {
    if (!movie.poster_path) continue;
    pool.set(movie.id, { ...movie, triggeredBy: "", appearances: 1 });
  }
  return pool;
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

function scoreCandidates(
  candidates: Candidate[],
  moodGenreIds: number[],
  totalSources: number
): Array<Candidate & { finalScore: number; moodScore: number }> {
  return candidates.map((c) => {
    // How consistently does this film appear across the user's top-film recommendation lists
    const tasteScore = Math.min(1, c.appearances / Math.max(totalSources, 1));

    // Genre alignment with the current mood (soft boost, not a filter)
    const moodOverlap = c.genre_ids.filter((id) => moodGenreIds.includes(id)).length;
    const moodScore = moodGenreIds.length > 0
      ? Math.min(1, moodOverlap / moodGenreIds.length)
      : 0;

    // Raw quality signal
    const qualityScore = Math.max(0, Math.min(1, (c.vote_average - 5) / 5));

    const finalScore = tasteScore * 0.55 + moodScore * 0.30 + qualityScore * 0.15;

    return { ...c, finalScore, moodScore };
  });
}

// ─── Genre diversity ──────────────────────────────────────────────────────────

/**
 * Pick top N from sorted candidates ensuring at most maxPerGenre films
 * share the same primary genre.
 */
type ScoredCandidate = Candidate & { finalScore: number; moodScore: number };

function pickWithGenreDiversity(
  sorted: ScoredCandidate[],
  n: number,
  maxPerGenre = 2
): ScoredCandidate[] {
  const genreCount = new Map<number, number>();
  const picked: ScoredCandidate[] = [];

  for (const candidate of sorted) {
    if (picked.length >= n) break;
    const primaryGenre = candidate.genre_ids[0];
    const count = genreCount.get(primaryGenre) ?? 0;
    if (count < maxPerGenre) {
      picked.push(candidate);
      genreCount.set(primaryGenre, count + 1);
    }
  }

  // If we couldn't fill 5 with diversity constraints, relax and fill the rest
  if (picked.length < n) {
    for (const candidate of sorted) {
      if (picked.length >= n) break;
      if (!picked.find((p) => p.id === candidate.id)) {
        picked.push(candidate);
      }
    }
  }

  return picked;
}

// ─── Blurb builder ────────────────────────────────────────────────────────────

function buildBlurb(
  movie: Candidate,
  genreNameMap: Map<number, string>,
  moodSignal: MoodSignal
): string {
  const year = movie.release_date ? parseInt(movie.release_date.slice(0, 4)) : null;
  const primaryGenreName = genreNameMap.get(movie.genre_ids[0]) ?? "película";
  const yearStr = year ? ` de ${year}` : "";
  const qualityStr = movie.vote_average >= 7.5 ? ", muy bien valorada" : "";

  if (movie.triggeredBy) {
    return `Porque te gustó "${movie.triggeredBy}" — ${primaryGenreName}${yearStr}${qualityStr}.`;
  }

  // Fallback when triggeredBy is not available (discover fallback pool)
  return `${primaryGenreName}${yearStr} que encaja con un momento ${moodSignal.toneLabel}${qualityStr}.`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateRecommendations(
  tasteProfile: TasteProfile,
  moodInput: MoodInput
): Promise<RecommendationsResponse> {
  const genreList = await getGenreList();
  const genreNameMap = new Map<number, string>(genreList.map((g) => [g.id, g.name]));

  // Build mood signal
  const signals = moodInput.categories.map((cat) => MOOD_MAP[cat]);
  const moodSignal = mergeMoodSignals(signals);

  // Apply free text genre boosts to mood genres
  const textBoosts = moodInput.freeText ? analyzeText(moodInput.freeText) : { genreIds: [], overrides: {} };
  const moodGenreIds = [...new Set([...moodSignal.genres, ...textBoosts.genreIds])];

  // Build candidate pool
  const useTasteFirst = tasteProfile.topRatedFilms.length >= 2;
  const pool = useTasteFirst
    ? await buildTasteFirstPool(tasteProfile)
    : await buildDiscoverFallbackPool(tasteProfile, moodSignal);

  // Filter already-watched films
  const watchedSet = new Set(tasteProfile.watchedTmdbIds);
  const unwatched = [...pool.values()].filter((m) => !watchedSet.has(m.id));
  const filteredOut = pool.size - unwatched.length;

  // Score
  const totalSources = tasteProfile.topRatedFilms.length;
  const scored = scoreCandidates(unwatched, moodGenreIds, totalSources);
  scored.sort((a, b) => b.finalScore - a.finalScore || b.moodScore - a.moodScore);

  // Pick top 5 with genre diversity
  const top5 = pickWithGenreDiversity(scored, 5);

  const movies: RecommendedMovie[] = top5.map((scored) => ({
    tmdbId: scored.id,
    title: scored.title,
    year: scored.release_date ? parseInt(scored.release_date.slice(0, 4)) : 0,
    posterPath: scored.poster_path,
    voteAverage: Math.round(scored.vote_average * 10) / 10,
    genres: scored.genre_ids
      .slice(0, 3)
      .map((id) => ({ id, name: genreNameMap.get(id) ?? "" }))
      .filter((g) => g.name),
    overview: scored.overview,
    blurb: buildBlurb(scored, genreNameMap, moodSignal),
    score: Math.round(scored.finalScore * 100) / 100,
    tmdbUrl: tmdbMovieUrl(scored.id),
    triggeredBy: scored.triggeredBy || undefined,
  }));

  const genresUsed = useTasteFirst
    ? [...new Set(top5.flatMap((m) => m.genre_ids.slice(0, 1)))].map((id) => genreNameMap.get(id) ?? "").filter(Boolean).slice(0, 3)
    : moodGenreIds.slice(0, 3).map((id) => genreNameMap.get(id) ?? "").filter(Boolean);

  return {
    movies,
    meta: {
      mood: moodSignal.toneLabel,
      genresUsed,
      totalCandidates: pool.size,
      filteredOut,
    },
  };
}
