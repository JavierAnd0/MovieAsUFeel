import { searchMovie } from "@/lib/tmdb/client";
import { LetterboxdNotFoundError } from "./parser";

/**
 * A user's public Letterboxd watchlist.
 *
 * Letterboxd has no RSS feed or API for watchlists, so this reads the public
 * watchlist pages (28 films each, most recently added first) and matches each
 * title + year on TMDB. It is the most fragile part of the app: if Letterboxd
 * changes its markup, parsing yields nothing and the watchlist is simply empty —
 * it never breaks recommendations.
 */
export type WatchlistFilm = {
  tmdbId: number;
  title: string;
  year: number;
  posterPath: string | null;
  voteAverage: number | null;
};

const MAX_PAGES = 3;       // ~84 most recent additions; enough signal, light on Letterboxd
const TMDB_BATCH = 10;
const CACHE_TTL_MS = 60 * 60 * 1000;

const cache = new Map<string, { at: number; films: WatchlistFilm[] }>();

const decodeEntities = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/** "Perfect Days (2023)" → { title: "Perfect Days", year: 2023 } */
function parseEntries(html: string): Array<{ title: string; year?: number }> {
  const entries: Array<{ title: string; year?: number }> = [];
  for (const match of html.matchAll(/data-item-full-display-name="([^"]+)"/g)) {
    const full = decodeEntities(match[1]).trim();
    const withYear = full.match(/^(.*)\s\((\d{4})\)$/);
    entries.push(withYear ? { title: withYear[1], year: Number(withYear[2]) } : { title: full });
  }
  return entries;
}

async function fetchPage(username: string, page: number): Promise<string | null> {
  const path = page === 1 ? "" : `page/${page}/`;
  const res = await fetch(`https://letterboxd.com/${encodeURIComponent(username)}/watchlist/${path}`, {
    headers: { "User-Agent": "MovieAsUFeel/1.0" },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 404 && page === 1) throw new LetterboxdNotFoundError(`Letterboxd user "${username}" not found.`);
  if (!res.ok) return null;
  return res.text();
}

async function resolveOnTMDB(entry: { title: string; year?: number }): Promise<WatchlistFilm | null> {
  try {
    const res = await searchMovie(entry.title, entry.year);
    const match = res.results[0];
    if (!match) return null;
    return {
      tmdbId: match.id,
      title: match.title || entry.title,
      year: match.release_date ? Number(match.release_date.slice(0, 4)) : entry.year ?? 0,
      posterPath: match.poster_path,
      voteAverage: match.vote_average ? Math.round(match.vote_average * 10) / 10 : null,
    };
  } catch {
    return null;
  }
}

export async function fetchLetterboxdWatchlist(username: string): Promise<WatchlistFilm[]> {
  const key = username.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.films;

  const entries: Array<{ title: string; year?: number }> = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const html = await fetchPage(username, page);
    if (!html) break;
    const found = parseEntries(html);
    entries.push(...found);
    // Stop when there is no next page (the last page has fewer films or no link to the next one)
    if (found.length === 0 || !html.includes(`/watchlist/page/${page + 1}/`)) break;
  }

  const films: WatchlistFilm[] = [];
  for (let i = 0; i < entries.length; i += TMDB_BATCH) {
    const batch = await Promise.all(entries.slice(i, i + TMDB_BATCH).map(resolveOnTMDB));
    films.push(...batch.filter((f): f is WatchlistFilm => f !== null));
  }

  const unique = [...new Map(films.map((f) => [f.tmdbId, f])).values()];
  cache.set(key, { at: Date.now(), films: unique });
  return unique;
}
