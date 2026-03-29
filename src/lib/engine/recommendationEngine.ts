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

  // Prefer vote_average sort if any signal requests it (more curated result)
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

  if (intersection.length >= 2) {
    return intersection.slice(0, 3);
  }
  if (intersection.length === 1) {
    // Pad with mood genres
    const extras = moodGenreIds.filter((id) => !intersection.includes(id)).slice(0, 2);
    return [intersection[0], ...extras];
  }
  // No overlap — use mood genres only
  return moodGenreIds.slice(0, 3);
}

function scoreMovie(
  movie: TMDBMovie,
  tasteGenreIds: number[],
  currentYear: number
): number {
  const voteScore = Math.max(0, Math.min(1, (movie.vote_average - 5) / 5));
  const popularityScore = Math.min(1, Math.log10(Math.max(1, movie.popularity)) / 3);
  const overlapCount = movie.genre_ids.filter((id) => tasteGenreIds.includes(id)).length;
  const genreOverlap = Math.min(1, overlapCount / 3);
  const releaseYear = movie.release_date ? parseInt(movie.release_date.slice(0, 4)) : 0;
  const recencyBoost = releaseYear >= currentYear - 3 ? 0.1 : 0;

  return (
    voteScore * 0.35 +
    genreOverlap * 0.30 +
    popularityScore * 0.20 +
    recencyBoost * 0.15
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

export async function generateRecommendations(
  tasteProfile: TasteProfile,
  moodInput: MoodInput
): Promise<RecommendationsResponse> {
  const genreList = await getGenreList();
  const genreNameMap = new Map<number, string>(genreList.map((g) => [g.id, g.name]));

  // Build mood signal
  const signals = moodInput.categories.map((cat) => MOOD_MAP[cat]);
  let moodSignal = mergeMoodSignals(signals);

  // Apply free text boosts
  const textBoosts = moodInput.freeText
    ? analyzeText(moodInput.freeText)
    : { genreIds: [], overrides: {} };

  const boostedGenres = [
    ...new Set([...moodSignal.genres, ...textBoosts.genreIds]),
  ];

  // Resolve query genres combining taste + mood
  const tasteGenreIds = tasteProfile.topGenres.map((g) => g.id);
  const queryGenres = resolveQueryGenres(tasteGenreIds, boostedGenres);

  const voteThreshold = (() => {
    if (tasteProfile.ratingBias === "picky") return Math.max(moodSignal.voteThreshold, 7.0);
    if (tasteProfile.ratingBias === "generous") return Math.max(moodSignal.voteThreshold - 0.5, 5.5);
    return moodSignal.voteThreshold;
  })();

  const discoverParams: Omit<DiscoverParams, "page"> = {
    with_genres: queryGenres.join("|"), // OR logic
    sort_by: moodSignal.sortBy,
    "vote_average.gte": voteThreshold,
    "vote_count.gte": 100,
    with_original_language: "en",
    ...textBoosts.overrides,
  };

  const candidates = await fetchDiscoverCandidates(discoverParams);

  // Filter out already-watched films
  const watchedSet = new Set(tasteProfile.watchedTmdbIds);
  const unwatched = candidates.filter((m) => !watchedSet.has(m.id));
  const filteredOut = candidates.length - unwatched.length;

  const currentYear = new Date().getFullYear();

  // Score and rank
  const scored = unwatched.map((movie) => ({
    movie,
    score: scoreMovie(movie, tasteGenreIds, currentYear),
  }));
  scored.sort((a, b) => b.score - a.score);

  const top20 = scored.slice(0, 20);

  const movies: RecommendedMovie[] = top20.map(({ movie, score }) => ({
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
    score: Math.round(score * 100) / 100,
    tmdbUrl: tmdbMovieUrl(movie.id),
  }));

  const genresUsed = queryGenres
    .map((id) => genreNameMap.get(id) ?? "")
    .filter(Boolean);

  return {
    movies,
    meta: {
      mood: moodSignal.toneLabel,
      genresUsed,
      totalCandidates: candidates.length,
      filteredOut,
    },
  };
}
