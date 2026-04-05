export type TMDBGenre = {
  id: number;
  name: string;
};

export type TMDBMovie = {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  overview: string;
  genre_ids: number[];
  original_language: string;
};

export type TMDBMovieDetail = TMDBMovie & {
  genres: TMDBGenre[];
  runtime: number | null;
  credits?: {
    crew: Array<{ job: string; name: string }>;
  };
};

export type TMDBSearchResponse = {
  results: TMDBMovie[];
  total_results: number;
  total_pages: number;
};

export type TMDBDiscoverResponse = {
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
};

export type DiscoverParams = {
  with_genres?: string;
  without_genres?: string;
  sort_by: string;
  "vote_average.gte": number;
  "vote_count.gte": number;
  with_original_language?: string;
  "primary_release_date.gte"?: string;
  "primary_release_date.lte"?: string;
  "with_runtime.lte"?: number;
  "with_runtime.gte"?: number;
  page?: number;
};
