import { searchKeyword, searchMovie, searchPerson } from "@/lib/tmdb/client";
import type { DiscoverParams, TMDBMovie } from "@/types/tmdb";
import type { TextIntent } from "./textAnalyzer";

/**
 * The user's free text, resolved to things TMDB can query. Every name the
 * analyzer produced is looked up, so a theme, title or person that doesn't
 * exist in TMDB simply drops out instead of steering the search.
 */
export type TextBoosts = {
  genreIds:          number[];
  excludeGenreIds:   number[];
  overrides:         Partial<DiscoverParams>;
  keywordIds:        number[];
  excludeKeywordIds: number[];
  similarTo:         TMDBMovie[];   // films the user named
  examples:          TMDBMovie[];   // films that exemplify the request
  people:            Array<{ id: number; name: string; directs: boolean }>;
  /** True when the text asks for something more precise than genre, length or era. */
  specific:          boolean;
};

export const NO_TEXT: TextBoosts = {
  genreIds: [], excludeGenreIds: [], overrides: {},
  keywordIds: [], excludeKeywordIds: [], similarTo: [], examples: [], people: [],
  specific: false,
};

const MAX_KEYWORDS = 8;
const MAX_TITLES = 8;
const MAX_PEOPLE = 3;

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Exact keyword name if TMDB has it; otherwise the closest result that contains every word. */
async function resolveKeyword(name: string): Promise<number | null> {
  try {
    const results = await searchKeyword(name);
    const wanted = normalize(name);
    const exact = results.find((k) => normalize(k.name) === wanted);
    if (exact) return exact.id;
    const words = wanted.split(" ");
    return results.find((k) => words.every((w) => normalize(k.name).split(" ").includes(w)))?.id ?? null;
  } catch {
    return null;
  }
}

async function resolveMovie(title: string): Promise<TMDBMovie | null> {
  try {
    // "Title (1999)" → search by title, constrained to that year
    const match = title.match(/^(.*?)\s*\((\d{4})\)\s*$/);
    const query = match ? match[1] : title;
    const res = await searchMovie(query, match ? Number(match[2]) : undefined);
    // Only accept a film whose title really is what was written: a loose phrase
    // ("como para reír") must not turn into whatever TMDB ranks first.
    const wanted = normalize(query).split(" ");
    return res.results.find((m) =>
      m.vote_count >= 20 &&
      [m.title, m.original_title ?? ""].some((t) => {
        const words = normalize(t).split(" ");
        return wanted.every((w) => words.includes(w));
      }),
    ) ?? null;
  } catch {
    return null;
  }
}

async function resolvePerson(name: string): Promise<TextBoosts["people"][number] | null> {
  try {
    const best = (await searchPerson(name))[0];
    return best ? { id: best.id, name: best.name, directs: best.known_for_department === "Directing" } : null;
  } catch {
    return null;
  }
}

const present = <T,>(value: T | null): value is T => value !== null;
const uniqueBy = <T,>(items: T[], key: (item: T) => number) =>
  [...new Map(items.map((item) => [key(item), item])).values()];

export async function resolveTextIntent(intent: TextIntent): Promise<TextBoosts> {
  const [keywordIds, excludeKeywordIds, similarTo, examples, people] = await Promise.all([
    Promise.all(intent.keywords.slice(0, MAX_KEYWORDS).map(resolveKeyword)),
    Promise.all(intent.excludeKeywords.slice(0, MAX_KEYWORDS).map(resolveKeyword)),
    Promise.all(intent.similarTo.slice(0, MAX_TITLES).map(resolveMovie)),
    Promise.all(intent.examples.slice(0, MAX_TITLES).map(resolveMovie)),
    Promise.all(intent.people.slice(0, MAX_PEOPLE).map(resolvePerson)),
  ]);

  const boosts: TextBoosts = {
    genreIds: intent.genreIds,
    excludeGenreIds: intent.excludeGenreIds,
    overrides: intent.overrides,
    keywordIds: [...new Set(keywordIds.filter(present))],
    excludeKeywordIds: [...new Set(excludeKeywordIds.filter(present))],
    similarTo: uniqueBy(similarTo.filter(present), (m) => m.id),
    examples: uniqueBy(examples.filter(present), (m) => m.id),
    people: uniqueBy(people.filter(present), (p) => p.id),
    specific: false,
  };
  boosts.specific =
    boosts.keywordIds.length + boosts.similarTo.length + boosts.examples.length + boosts.people.length > 0;
  return boosts;
}
