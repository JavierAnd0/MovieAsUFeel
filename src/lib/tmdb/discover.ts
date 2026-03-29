import { discoverMovies } from "./client";
import type { DiscoverParams, TMDBMovie } from "@/types/tmdb";

/**
 * Fetches pages 1–3 of /discover/movie in parallel and returns all results.
 * Uses OR logic for genres (pipe separator) to avoid being too restrictive.
 */
export async function fetchDiscoverCandidates(
  baseParams: Omit<DiscoverParams, "page">
): Promise<TMDBMovie[]> {
  const pages = await Promise.all(
    [1, 2, 3].map((page) =>
      discoverMovies({ ...baseParams, page }).catch(() => null)
    )
  );

  const seen = new Set<number>();
  const results: TMDBMovie[] = [];

  for (const page of pages) {
    if (!page) continue;
    for (const movie of page.results) {
      if (!seen.has(movie.id)) {
        seen.add(movie.id);
        results.push(movie);
      }
    }
  }

  return results;
}
