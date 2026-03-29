import type { DiscoverParams } from "@/types/tmdb";

type TextBoosts = {
  genreIds: number[];
  overrides: Partial<DiscoverParams>;
};

const KEYWORD_RULES: Array<{
  patterns: string[];
  genreIds?: number[];
  overrides?: Partial<DiscoverParams>;
}> = [
  { patterns: ["funny", "humor", "laugh", "comedia", "gracioso", "reír"], genreIds: [35] },
  { patterns: ["scary", "horror", "miedo", "terror", "susto"], genreIds: [27] },
  { patterns: ["romantic", "romance", "amor", "love story", "love"], genreIds: [10749] },
  { patterns: ["action", "acción", "fight", "explosion", "pelea", "accion"], genreIds: [28] },
  { patterns: ["documentary", "documental", "real", "true story", "historia real"], genreIds: [99] },
  { patterns: ["animated", "animation", "animada", "animación", "animacion", "cartoon"], genreIds: [16] },
  { patterns: ["sci-fi", "science fiction", "scifi", "ciencia ficción", "ciencia ficcion"], genreIds: [878] },
  {
    patterns: ["old", "classic", "clásica", "clasica", "vintage", "antigua", "antigua"],
    overrides: { "primary_release_date.lte": "1995-12-31" },
  },
  {
    patterns: ["new", "recent", "recent", "nueva", "último", "ultimo", "reciente"],
    overrides: { "primary_release_date.gte": `${new Date().getFullYear() - 2}-01-01` },
  },
  {
    patterns: ["short", "corta", "corto", "breve", "quick"],
    overrides: { "with_runtime.lte": 95 },
  },
  {
    patterns: ["long", "larga", "largo", "epic", "épica", "epica"],
    overrides: { "with_runtime.lte": 999 }, // effectively no limit, just a signal
  },
];

export function analyzeText(text: string): TextBoosts {
  const lower = text.toLowerCase();
  const genreIds: number[] = [];
  const overrides: Partial<DiscoverParams> = {};

  for (const rule of KEYWORD_RULES) {
    if (rule.patterns.some((p) => lower.includes(p))) {
      if (rule.genreIds) genreIds.push(...rule.genreIds);
      if (rule.overrides) Object.assign(overrides, rule.overrides);
    }
  }

  return { genreIds: [...new Set(genreIds)], overrides };
}
