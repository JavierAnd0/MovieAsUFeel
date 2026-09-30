import { searchMovie, getGenreList, getMovieDetail } from "@/lib/tmdb/client";
import type { WatchedFilm, TasteProfile, SeedFilm } from "@/types/letterboxd";

const BATCH_SIZE = 10;
const MAX_SEEDS = 10;

/** Fills in genres, language and the localized title for one diary entry. */
async function enrichFilm(film: WatchedFilm): Promise<WatchedFilm> {
  try {
    // The RSS feed carries the TMDB id — exact match, no guessing by title.
    if (film.tmdbId) {
      const detail = await getMovieDetail(film.tmdbId);
      return {
        ...film,
        title: detail.title || film.title,
        genreIds: detail.genres.map((g) => g.id),
        originalLanguage: detail.original_language,
        voteCount: detail.vote_count,
      };
    }
    const search = await searchMovie(film.title, film.year || undefined);
    const match = search.results[0];
    if (match) {
      return {
        ...film,
        title: match.title || film.title,
        tmdbId: match.id,
        genreIds: match.genre_ids,
        originalLanguage: match.original_language,
        voteCount: match.vote_count,
      };
    }
  } catch {
    // A film that can't be resolved simply doesn't inform the profile
  }
  return film;
}

async function enrichWithTMDB(films: WatchedFilm[]): Promise<WatchedFilm[]> {
  const enriched: WatchedFilm[] = [];
  for (let i = 0; i < films.length; i += BATCH_SIZE) {
    enriched.push(...(await Promise.all(films.slice(i, i + BATCH_SIZE).map(enrichFilm))));
  }
  return enriched;
}

/**
 * How much the user liked one film, in [-1, 1], relative to their own average.
 * A 3★ from someone who averages 4★ is a mild dislike; from someone who
 * averages 2.5★ it is praise. Unrated entries count as a faint positive
 * (they chose to watch it), a heart as a clear one.
 */
function preference(film: WatchedFilm, avgRating: number): number {
  const likeBonus = film.liked ? 0.35 : 0;
  if (film.rating === undefined) return Math.min(1, 0.15 + likeBonus);
  return Math.max(-1, Math.min(1, (film.rating - avgRating) / 1.5 + likeBonus));
}

export async function buildTasteProfile(
  username: string,
  films: WatchedFilm[]
): Promise<TasteProfile> {
  const [genreList, enriched] = await Promise.all([getGenreList(), enrichWithTMDB(films)]);
  const genreNameMap = new Map<number, string>(genreList.map((g) => [g.id, g.name]));

  const ratedFilms = enriched.filter((f) => f.rating !== undefined);
  const avgRating =
    ratedFilms.length > 0
      ? ratedFilms.reduce((sum, f) => sum + (f.rating ?? 0), 0) / ratedFilms.length
      : 3.5;

  const ratingBias: TasteProfile["ratingBias"] =
    avgRating < 3.2 ? "picky" : avgRating > 4.0 ? "generous" : "balanced";

  // ── Genre affinity ────────────────────────────────────────────────────────
  // Two signals per genre: how often it shows up (exposure) and how well those
  // films were rated against the user's own average (preference). Recent
  // entries weigh a little more. The preference mean is shrunk towards 0 so a
  // single 5★ western doesn't make someone a western fan.
  const stats = new Map<number, { exposure: number; prefSum: number; weight: number }>();
  const withGenres = enriched.filter((f) => (f.genreIds?.length ?? 0) > 0);

  withGenres.forEach((film, index) => {
    const recency = Math.pow(0.5, index / 60); // films arrive most-recent first
    const pref = preference(film, avgRating);
    for (const gId of film.genreIds ?? []) {
      const s = stats.get(gId) ?? { exposure: 0, prefSum: 0, weight: 0 };
      s.exposure += recency;
      s.prefSum += pref * recency;
      s.weight += recency;
      stats.set(gId, s);
    }
  });

  const maxExposure = Math.max(...[...stats.values()].map((s) => s.exposure), 1);
  const genreAffinity: Record<string, number> = {};
  for (const [id, s] of stats) {
    const exposure = s.exposure / maxExposure;          // 0..1
    const liking = s.prefSum / (s.weight + 2);           // shrunk mean, about -1..1
    const affinity = 0.4 * exposure + 0.6 * liking;
    genreAffinity[id] = Math.round(Math.max(-1, Math.min(1, affinity)) * 1000) / 1000;
  }

  const topGenres = Object.entries(genreAffinity)
    .map(([id, score]) => ({ id: Number(id), name: genreNameMap.get(Number(id)) ?? "", score }))
    .filter((g) => g.name)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // ── Seeds: the films this person clearly loved ────────────────────────────
  const seedThreshold = Math.max(4, avgRating + 0.5);
  const loved = enriched.filter(
    (f) => f.tmdbId !== undefined && ((f.rating ?? 0) >= seedThreshold || f.liked)
  );
  // Few ratings? Fall back to the best of whatever is there.
  const seedPool = loved.length >= 3
    ? loved
    : [...enriched]
        .filter((f) => f.tmdbId !== undefined)
        .sort((a, b) => (b.rating ?? avgRating) - (a.rating ?? avgRating));

  const seenSeed = new Set<number>();
  const seeds: SeedFilm[] = [];
  for (const f of [...seedPool].sort((a, b) => (b.rating ?? avgRating) - (a.rating ?? avgRating))) {
    if (seenSeed.has(f.tmdbId!)) continue; // rewatches appear twice in the diary
    seenSeed.add(f.tmdbId!);
    seeds.push({
      tmdbId: f.tmdbId!,
      title: f.title,
      rating: f.rating ?? Math.min(5, avgRating + 0.5),
      genreIds: f.genreIds ?? [],
    });
    if (seeds.length >= MAX_SEEDS) break;
  }

  // ── Languages that make up at least 10% of the diary ─────────────────────
  const langCounts = new Map<string, number>();
  for (const f of enriched) {
    if (f.originalLanguage) langCounts.set(f.originalLanguage, (langCounts.get(f.originalLanguage) ?? 0) + 1);
  }
  const languages = [...langCounts.entries()]
    .filter(([, count]) => count / Math.max(enriched.length, 1) >= 0.1)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang);

  const recentGenres = [...new Set(enriched.slice(0, 10).flatMap((f) => f.genreIds ?? []))];
  const watchedTmdbIds = [...new Set(enriched.filter((f) => f.tmdbId !== undefined).map((f) => f.tmdbId as number))];

  return {
    username,
    filmCount: films.length,
    avgRating: Math.round(avgRating * 10) / 10,
    ratingBias,
    topGenres,
    genreAffinity,
    seeds,
    languages,
    topDirectors: [],
    watchedTmdbIds,
    recentGenres,
  };
}
