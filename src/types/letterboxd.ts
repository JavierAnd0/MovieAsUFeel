export type WatchedFilm = {
  title: string;
  year: number;
  letterboxdUrl: string;
  rating?: number; // 0.5–5.0 in 0.5 increments
  watchedDate: string;
  tmdbId?: number;
  genreIds?: number[];
};

export type TopRatedFilm = {
  tmdbId: number;
  title: string;
  rating: number;
  genreIds: number[];
};

export type TasteProfile = {
  username: string;
  filmCount: number;
  avgRating: number;
  ratingBias: "picky" | "balanced" | "generous";
  topGenres: Array<{ id: number; name: string; score: number }>;
  topDirectors: string[];
  watchedTmdbIds: number[];
  recentGenres: number[];
  topRatedFilms: TopRatedFilm[];
};
