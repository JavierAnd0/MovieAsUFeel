import { fetchDiscoverCandidates } from "@/lib/tmdb/discover";
import { getGenreList } from "@/lib/tmdb/client";
import { MOOD_MAP } from "@/lib/mood/moodMap";
import { analyzeText } from "@/lib/mood/textAnalyzer";
import type { TasteProfile } from "@/types/letterboxd";
import type { MoodInput, MoodSignal } from "@/types/mood";
import type { TMDBMovie, DiscoverParams } from "@/types/tmdb";
import type { RecommendedMovie, RecommendationsResponse } from "@/types/recommendation";
import { tmdbMovieUrl } from "@/lib/tmdb/client";

function mergeMoodSignals(signals: MoodSignal[]): MoodSignal {
  if (signals.length === 1) return signals[0];

  const allGenres = [...new Set(signals.flatMap((s) => s.genres))];
  const allKeywords = [...new Set(signals.flatMap((s) => s.keywords))];
  const avgVoteThreshold = signals.reduce((s, sig) => s + sig.voteThreshold, 0) / signals.length;

  const sortBy = signals.some((s) => s.sortBy === "vote_average.desc")
    ? "vote_average.desc"
    : "popularity.desc";

  const toneLabel = signals.map((s) => s.toneLabel).join(" / ");

  return {
    genres: allGenres,
    keywords: allKeywords,
    sortBy,
    voteThreshold: Math.round(avgVoteThreshold * 10) / 10,
    toneLabel,
  };
}

function resolveQueryGenres(
  tasteGenreIds: number[],
  moodGenreIds: number[]
): number[] {
  const intersection = tasteGenreIds.filter((id) => moodGenreIds.includes(id));

  if (intersection.length >= 2) return intersection.slice(0, 3);
  if (intersection.length === 1) {
    const extras = moodGenreIds.filter((id) => !intersection.includes(id)).slice(0, 2);
    return [intersection[0], ...extras];
  }
  return moodGenreIds.slice(0, 3);
}

/**
 * Computes a compatibility score in [0, 1] using four factors:
 *
 *  - genreAffinity  (35%) — how closely the movie's genres match the user's
 *                           actual taste profile scores (frequency × avg rating)
 *  - voteQuality    (30%) — TMDB rating normalised against the user's rating bias
 *  - moodAlignment  (20%) — overlap between the movie's genres and the mood signal
 *  - popularity     (15%) — log-normalised TMDB popularity
 *
 * Weights sum to exactly 1.0, every component is clamped to [0, 1],
 * so the result is always in [0, 1].  Multiply by 100 for a clean percentage.
 */
function scoreMovie(
  movie: TMDBMovie,
  tasteProfile: TasteProfile,
  moodGenres: number[],
): number {
  // ── 1. Vote quality (30%) ────────────────────────────────────────────────
  const biasBaseline = tasteProfile.ratingBias === "picky"    ? 6.0
                     : tasteProfile.ratingBias === "generous" ? 4.5
                     : 5.0;
  const biasRange    = tasteProfile.ratingBias === "picky"    ? 4.0
                     : tasteProfile.ratingBias === "generous" ? 5.5
                     : 5.0;
  const voteScore = Math.max(0, Math.min(1, (movie.vote_average - biasBaseline) / biasRange));

  // ── 2. Genre affinity (35%) ──────────────────────────────────────────────
  // Use the weighted genre score from the user's taste profile (not just presence/absence)
  const maxProfileScore = Math.max(...tasteProfile.topGenres.map((g) => g.score), 1);
  const genreScoreMap   = new Map(tasteProfile.topGenres.map((g) => [g.id, g.score]));

  const affinityValues = movie.genre_ids.map(
    (id) => (genreScoreMap.get(id) ?? 0) / maxProfileScore
  );
  const hasAnyMatch   = affinityValues.some((v) => v > 0);
  // Multiply by 2.5 so a single strong genre match already yields a meaningful score
  const genreAffinity = hasAnyMatch
    ? Math.min(
        1,
        (affinityValues.reduce((a, b) => a + b, 0) / Math.max(movie.genre_ids.length, 1)) * 2.5
      )
    : 0;

  // ── 3. Mood alignment (20%) ──────────────────────────────────────────────
  const moodMatches   = movie.genre_ids.filter((id) => moodGenres.includes(id)).length;
  const moodAlignment = moodGenres.length > 0
    ? Math.min(1, moodMatches / Math.min(moodGenres.length, 3))
    : 0;

  // ── 4. Popularity (15%) ──────────────────────────────────────────────────
  const popularityScore = Math.min(1, Math.log10(Math.max(1, movie.popularity)) / 3);

  return (
    voteScore      * 0.30 +
    genreAffinity  * 0.35 +
    moodAlignment  * 0.20 +
    popularityScore * 0.15
  );
}

function buildBlurb(
  movie: TMDBMovie,
  genreNames: Map<number, string>,
  tasteGenreIds: number[],
  moodSignal: MoodSignal
): string {
  const year = movie.release_date ? parseInt(movie.release_date.slice(0, 4)) : null;
  const matchedGenreIds = movie.genre_ids.filter((id) => tasteGenreIds.includes(id));
  const primaryGenreName = genreNames.get(movie.genre_ids[0]) ?? "película";

  const genrePart =
    matchedGenreIds.length > 0
      ? `encaja con tu gusto por ${genreNames.get(matchedGenreIds[0]) ?? "este género"}`
      : `perfecta para un momento ${moodSignal.toneLabel}`;

  const ratingPart = movie.vote_average >= 7.5 ? ", muy bien valorada" : "";

  return `Una ${primaryGenreName}${year ? ` de ${year}` : ""} que ${genrePart}${ratingPart}.`;
}

function toRecommendedMovie(
  movie: TMDBMovie,
  score: number,
  alreadySeen: boolean,
  genreNameMap: Map<number, string>,
  tasteGenreIds: number[],
  moodSignal: MoodSignal
): RecommendedMovie {
  return {
    tmdbId: movie.id,
    title: movie.title,
    year: movie.release_date ? parseInt(movie.release_date.slice(0, 4)) : 0,
    posterPath: movie.poster_path,
    voteAverage: Math.round(movie.vote_average * 10) / 10,
    genres: movie.genre_ids
      .slice(0, 3)
      .map((id) => ({ id, name: genreNameMap.get(id) ?? "" }))
      .filter((g) => g.name),
    overview: movie.overview,
    blurb: buildBlurb(movie, genreNameMap, tasteGenreIds, moodSignal),
    // Convert 0–1 to a clean 0–100 integer for display
    score: Math.round(score * 100),
    tmdbUrl: tmdbMovieUrl(movie.id),
    alreadySeen,
  };
}

export async function generateRecommendations(
  tasteProfile: TasteProfile,
  moodInput: MoodInput
): Promise<RecommendationsResponse> {
  const genreList = await getGenreList();
  const genreNameMap = new Map<number, string>(genreList.map((g) => [g.id, g.name]));

  // Build mood signal
  const signals    = moodInput.categories.map((cat) => MOOD_MAP[cat]);
  let moodSignal   = mergeMoodSignals(signals);

  const textBoosts = moodInput.freeText
    ? analyzeText(moodInput.freeText)
    : { genreIds: [], overrides: {} };

  const boostedGenres = [...new Set([...moodSignal.genres, ...textBoosts.genreIds])];

  const tasteGenreIds = tasteProfile.topGenres.map((g) => g.id);
  const queryGenres   = resolveQueryGenres(tasteGenreIds, boostedGenres);

  const voteThreshold = (() => {
    if (tasteProfile.ratingBias === "picky")    return Math.max(moodSignal.voteThreshold, 7.0);
    if (tasteProfile.ratingBias === "generous") return Math.max(moodSignal.voteThreshold - 0.5, 5.5);
    return moodSignal.voteThreshold;
  })();

  const discoverParams: Omit<DiscoverParams, "page"> = {
    with_genres: queryGenres.join("|"),
    sort_by: moodSignal.sortBy,
    "vote_average.gte": voteThreshold,
    "vote_count.gte": 100,
    with_original_language: "en",
    ...textBoosts.overrides,
  };

  const candidates = await fetchDiscoverCandidates(discoverParams);

  const watchedSet = new Set(tasteProfile.watchedTmdbIds);

  // Score every candidate — watched and unwatched alike
  const scored = candidates.map((movie) => ({
    movie,
    score: scoreMovie(movie, tasteProfile, moodSignal.genres),
    alreadySeen: watchedSet.has(movie.id),
  }));
  scored.sort((a, b) => b.score - a.score);

  // Top 12 unwatched recommendations
  const topUnwatched = scored
    .filter((s) => !s.alreadySeen)
    .slice(0, 12);

  // Top 8 already-seen movies that still match well (shown in a separate section)
  const topWatched = scored
    .filter((s) => s.alreadySeen)
    .slice(0, 8);

  const movies: RecommendedMovie[] = [
    ...topUnwatched.map(({ movie, score }) =>
      toRecommendedMovie(movie, score, false, genreNameMap, tasteGenreIds, moodSignal)
    ),
    ...topWatched.map(({ movie, score }) =>
      toRecommendedMovie(movie, score, true, genreNameMap, tasteGenreIds, moodSignal)
    ),
  ];

  const genresUsed = queryGenres
    .map((id) => genreNameMap.get(id) ?? "")
    .filter(Boolean);

  return {
    movies,
    meta: {
      mood: moodSignal.toneLabel,
      genresUsed,
      totalCandidates: candidates.length,
      filteredOut: 0,
    },
  };
}
