export type WatchedFilm = {
  title: string;
  year: number;
  letterboxdUrl: string;
  rating?: number; // 0.5–5.0 in 0.5 increments
  liked?: boolean; // the heart on Letterboxd
  watchedDate: string;
  tmdbId?: number;
  genreIds?: number[];
  originalLanguage?: string;
  voteCount?: number;
};

/** A film the user clearly loved; used as a starting point for "more like this". */
export type SeedFilm = {
  tmdbId: number;
  title: string;
  rating: number;
  genreIds: number[];
  /** Not rated by the user: a film on their list, used as a weaker "more like this". */
  fromWatchlist?: boolean;
};

export type TasteProfile = {
  username: string;
  filmCount: number;
  avgRating: number;
  ratingBias: "picky" | "balanced" | "generous";
  /** Best-liked genres first; `score` is the affinity in [-1, 1]. */
  topGenres: Array<{ id: number; name: string; score: number }>;
  /** Affinity in [-1, 1] for every genre seen in the diary (negative = tends to dislike). */
  genreAffinity: Record<string, number>;
  seeds: SeedFilm[];
  /** Original languages that make up a meaningful share of the diary. */
  languages: string[];
  /** Median TMDB vote count of the diary: how mainstream this person's viewing is. */
  typicalVotes?: number;
  topDirectors: string[];
  watchedTmdbIds: number[];
  recentGenres: number[];
};
