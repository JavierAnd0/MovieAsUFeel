export type RecommendedMovie = {
  tmdbId: number;
  title: string;
  year: number;
  posterPath: string | null;
  voteAverage: number;
  genres: Array<{ id: number; name: string }>;
  overview: string;
  blurb: string;
  score: number;
  tmdbUrl: string;
  triggeredBy?: string; // título del film del usuario que originó esta recomendación
};

export type RecommendationsResponse = {
  movies: RecommendedMovie[];
  meta: {
    mood: string;
    genresUsed: string[];
    totalCandidates: number;
    filteredOut: number;
  };
};
