import { discoverMovies } from "./client";
import type { DiscoverParams, TMDBMovie } from "@/types/tmdb";

/**
 * Fetches three consecutive pages of /discover/movie in parallel and returns all results.
 * `round` 0 reads pages 1–3, round 1 reads 4–6, and so on ("otra tanda").
 * Uses OR logic for genres (pipe separator) to avoid being too restrictive.
 */
export async function fetchDiscoverCandidates(
  baseParams: Omit<DiscoverParams, "page">,
  round = 0
): Promise<TMDBMovie[]> {
  const firstPage = round * 3 + 1;
  const pages = await Promise.all(
    [firstPage, firstPage + 1, firstPage + 2].map((page) =>
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
