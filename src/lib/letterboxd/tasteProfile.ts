import { searchMovie, getGenreList } from "@/lib/tmdb/client";
import type { WatchedFilm, TasteProfile, TopRatedFilm } from "@/types/letterboxd";
import type { TMDBGenre } from "@/types/tmdb";

async function enrichWithTMDB(films: WatchedFilm[]): Promise<WatchedFilm[]> {
  const enriched: WatchedFilm[] = [];

  // Process in batches of 5 to respect TMDB rate limits
  for (let i = 0; i < films.length; i += 5) {
    const batch = films.slice(i, i + 5);
    const results = await Promise.all(
      batch.map(async (film) => {
        try {
          const search = await searchMovie(film.title, film.year || undefined);
          const match = search.results[0];
          if (match) {
            return { ...film, tmdbId: match.id, genreIds: match.genre_ids };
          }
        } catch {
          // Silently skip films that can't be found
        }
        return film;
      })
    );
    enriched.push(...results);

    // Small delay between batches to avoid rate limiting
    if (i + 5 < films.length) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  return enriched;
}

export async function buildTasteProfile(
  username: string,
  films: WatchedFilm[]
): Promise<TasteProfile> {
  const genreList = await getGenreList();
  const genreNameMap = new Map<number, string>(genreList.map((g) => [g.id, g.name]));

  const enriched = await enrichWithTMDB(films);

  // Compute stats
  const ratedFilms = enriched.filter((f) => f.rating !== undefined);
  const avgRating =
    ratedFilms.length > 0
      ? ratedFilms.reduce((sum, f) => sum + (f.rating ?? 0), 0) / ratedFilms.length
      : 3.5;

  const ratingBias: TasteProfile["ratingBias"] =
    avgRating < 3.2 ? "picky" : avgRating > 4.0 ? "generous" : "balanced";

  // Genre scoring: frequency × weighted rating
  const genreScores = new Map<number, { count: number; ratingSum: number }>();
  for (const film of enriched) {
    const weight = film.rating ?? avgRating;
    for (const gId of film.genreIds ?? []) {
      const existing = genreScores.get(gId) ?? { count: 0, ratingSum: 0 };
      genreScores.set(gId, {
        count: existing.count + 1,
        ratingSum: existing.ratingSum + weight,
      });
    }
  }

  const topGenres: TasteProfile["topGenres"] = [];
  for (const [id, { count, ratingSum }] of genreScores.entries()) {
    const score = count * (ratingSum / count); // frequency × avg_rating
    topGenres.push({
      id,
      name: genreNameMap.get(id) ?? `Genre ${id}`,
      score,
    });
  }
  topGenres.sort((a, b) => b.score - a.score);

  // Recent genres (last 10 films)
  const recentGenres = [
    ...new Set(
      enriched
        .slice(0, 10)
        .flatMap((f) => f.genreIds ?? [])
    ),
  ];

  const watchedTmdbIds = enriched
    .filter((f) => f.tmdbId !== undefined)
    .map((f) => f.tmdbId as number);

  // Top 5 films best rated by the user (with TMDB data available)
  const topRatedFilms: TopRatedFilm[] = enriched
    .filter((f) => f.tmdbId !== undefined && f.rating !== undefined && (f.genreIds?.length ?? 0) > 0)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 5)
    .map((f) => ({
      tmdbId: f.tmdbId as number,
      title: f.title,
      rating: f.rating as number,
      genreIds: f.genreIds ?? [],
    }));

  return {
    username,
    filmCount: films.length,
    avgRating: Math.round(avgRating * 10) / 10,
    ratingBias,
    topGenres: topGenres.slice(0, 10),
    topDirectors: [],
    watchedTmdbIds,
    recentGenres,
    topRatedFilms,
  };
}

export function getGenreNames(
  genreIds: number[],
  allGenres: TMDBGenre[]
): string[] {
  const map = new Map(allGenres.map((g) => [g.id, g.name]));
  return genreIds.map((id) => map.get(id) ?? "").filter(Boolean);
}
