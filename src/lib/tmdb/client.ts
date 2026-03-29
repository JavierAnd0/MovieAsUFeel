import type {
  TMDBSearchResponse,
  TMDBDiscoverResponse,
  TMDBGenre,
  DiscoverParams,
} from "@/types/tmdb";

const BASE = "https://api.themoviedb.org/3";

function apiKey() {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY is not set");
  return key;
}

async function tmdbFetch<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("api_key", apiKey());
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) {
    throw new Error(`TMDB ${path} → ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function searchMovie(
  title: string,
  year?: number
): Promise<TMDBSearchResponse> {
  return tmdbFetch<TMDBSearchResponse>("/search/movie", {
    query: title,
    ...(year ? { year } : {}),
  });
}

export async function discoverMovies(
  params: DiscoverParams
): Promise<TMDBDiscoverResponse> {
  const flat: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) flat[k] = v;
  }
  return tmdbFetch<TMDBDiscoverResponse>("/discover/movie", flat);
}

export async function getGenreList(): Promise<TMDBGenre[]> {
  const data = await tmdbFetch<{ genres: TMDBGenre[] }>("/genre/movie/list", {
    language: "en",
  });
  return data.genres;
}

export async function getMovieRecommendations(id: number): Promise<TMDBDiscoverResponse> {
  return tmdbFetch<TMDBDiscoverResponse>(`/movie/${id}/recommendations`, { page: 1 });
}

export async function getSimilarMovies(id: number): Promise<TMDBDiscoverResponse> {
  return tmdbFetch<TMDBDiscoverResponse>(`/movie/${id}/similar`, { page: 1 });
}

export function posterUrl(path: string | null, size: "w185" | "w342" | "w500" = "w342"): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function tmdbMovieUrl(id: number): string {
  return `https://www.themoviedb.org/movie/${id}`;
}
