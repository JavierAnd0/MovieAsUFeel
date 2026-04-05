import type { DiscoverParams } from "@/types/tmdb";

export type TextBoosts = {
  genreIds:        number[];   // genres to INCLUDE / boost
  excludeGenreIds: number[];   // genres to EXCLUDE from results
  overrides:       Partial<DiscoverParams>;
};

// ─── Negation detection ────────────────────────────────────────────────────
// Returns true if the keyword appears directly after a negation word
// in the original text (within a ~35-char window).
const NEGATION_WORDS = ["no ", "nada de ", "sin ", "evita ", "evitar ", "nada ", "tampoco "];

function isNegated(lower: string, pattern: string): boolean {
  let idx = lower.indexOf(pattern);
  while (idx !== -1) {
    const before = lower.slice(Math.max(0, idx - 35), idx);
    if (NEGATION_WORDS.some((neg) => before.includes(neg))) return true;
    idx = lower.indexOf(pattern, idx + 1);
  }
  return false;
}

function matchesPositive(lower: string, patterns: string[]): boolean {
  return patterns.some((p) => lower.includes(p) && !isNegated(lower, p));
}

function matchesNegative(lower: string, patterns: string[]): boolean {
  return patterns.some((p) => lower.includes(p) && isNegated(lower, p));
}

// ─── Genre rules ───────────────────────────────────────────────────────────
type GenreRule = {
  patterns: string[];
  genreIds: number[];
};

const GENRE_RULES: GenreRule[] = [
  // Comedy
  {
    patterns: ["funny", "humor", "comedia", "gracioso", "graciosa", "reír", "reir", "chistosa", "chistoso", "cómica", "comica"],
    genreIds: [35],
  },
  // Horror
  {
    patterns: ["scary", "horror", "miedo", "terror", "susto", "escalofr", "pesadilla", "aterrador", "assustador"],
    genreIds: [27],
  },
  // Romance
  {
    patterns: ["romántica", "romantica", "romantic", "romance", "amor", "love story", "pareja", "amorosa"],
    genreIds: [10749],
  },
  // Action
  {
    patterns: ["acción", "accion", "action", "fight", "explosion", "pelea", "peleas", "adrenalina", "combate"],
    genreIds: [28],
  },
  // Adventure
  {
    patterns: ["aventura", "aventuras", "adventure", "exploración", "exploracion", "viaje épico", "epica", "épica"],
    genreIds: [12],
  },
  // Documentary
  {
    patterns: ["documental", "documentary", "real", "true story", "historia real", "basada en hechos", "based on"],
    genreIds: [99],
  },
  // Animation
  {
    patterns: ["animada", "animado", "animación", "animacion", "animated", "animation", "cartoon", "pixar", "disney"],
    genreIds: [16],
  },
  // Sci-Fi
  {
    patterns: ["sci-fi", "science fiction", "scifi", "ciencia ficción", "ciencia ficcion", "espacial", "futurista", "robots", "ia ", "inteligencia artificial"],
    genreIds: [878],
  },
  // Fantasy
  {
    patterns: ["fantasía", "fantasia", "fantasy", "magia", "mágica", "magica", "dragones", "brujería", "hechicero"],
    genreIds: [14],
  },
  // Thriller / Suspense
  {
    patterns: ["suspenso", "thriller", "intriga", "tensión", "tension", "emocionante", "giro", "twist", "inesperado"],
    genreIds: [53],
  },
  // Crime / Mystery
  {
    patterns: ["crimen", "crime", "policiaca", "policial", "detective", "misterio", "mystery", "investigación", "investigacion", "asesino", "robo"],
    genreIds: [80, 9648],
  },
  // Drama
  {
    patterns: ["drama", "dramática", "dramatica", "profunda", "emotiva", "conmovedora", "lágrimas", "lagrimas", "llanto"],
    genreIds: [18],
  },
  // History
  {
    patterns: ["histórica", "historica", "historical", "history", "época", "epoca", "período histórico"],
    genreIds: [36],
  },
  // Music
  {
    patterns: ["musical", "música", "musica", "concierto", "concert", "banda"],
    genreIds: [10402],
  },
  // Family
  {
    patterns: ["familiar", "familia", "niños", "infantil", "para toda la familia", "family"],
    genreIds: [10751],
  },
  // War
  {
    patterns: ["guerra", "war", "bélica", "belica", "soldados", "batalla", "mundial"],
    genreIds: [10752],
  },
  // Western
  {
    patterns: ["western", "vaqueros", "far west", "salvaje oeste", "pistoleros"],
    genreIds: [37],
  },
  // Biography
  {
    patterns: ["biográfica", "biografica", "biopic", "vida real", "persona real", "biography"],
    genreIds: [99, 18],
  },
  // Superhero / Comic
  {
    patterns: ["superhéroe", "superheroe", "superhero", "marvel", "dc ", "cómic", "comic", "spider", "batman", "avengers"],
    genreIds: [28, 12],
  },
];

// ─── Override rules (runtime, date, quality, language) ────────────────────
type OverrideRule = {
  patterns:   string[];
  overrides:  Partial<DiscoverParams>;
};

const currentYear = new Date().getFullYear();

const OVERRIDE_RULES: OverrideRule[] = [
  // SHORT films
  {
    patterns: ["corta", "corto", "breve", "quick", "short", "rápida", "rapida", "no muy larga", "no larga"],
    overrides: { "with_runtime.lte": 100 },
  },
  // LONG films
  {
    patterns: ["larga", "largo", "long", "épica", "epica", "epic"],
    overrides: { "with_runtime.gte": 130 },
  },
  // RECENT (last 3 years)
  {
    patterns: ["reciente", "nueva", "nuevo", "moderna", "moderno", "recent", "estreno", "actual", "de ahora"],
    overrides: { "primary_release_date.gte": `${currentYear - 3}-01-01` },
  },
  // CLASSIC / OLD
  {
    patterns: ["clásica", "clasica", "classic", "antigua", "antiguo", "vintage", "vieja", "viejo", "old"],
    overrides: { "primary_release_date.lte": "1995-12-31" },
  },
  // 80s
  {
    patterns: ["80s", "años 80", "ochenta", "1980"],
    overrides: { "primary_release_date.gte": "1980-01-01", "primary_release_date.lte": "1989-12-31" },
  },
  // 90s
  {
    patterns: ["90s", "años 90", "noventa", "1990"],
    overrides: { "primary_release_date.gte": "1990-01-01", "primary_release_date.lte": "1999-12-31" },
  },
  // 2000s
  {
    patterns: ["2000s", "años 2000", "dos mil"],
    overrides: { "primary_release_date.gte": "2000-01-01", "primary_release_date.lte": "2009-12-31" },
  },
  // HIGH QUALITY / Award films
  {
    patterns: ["premiada", "premio", "oscar", "aclamada", "crítica", "critica", "award", "acclaimed", "obra maestra", "masterpiece"],
    overrides: { "vote_average.gte": 7.5, sort_by: "vote_average.desc" },
  },
];

// ─── Main export ───────────────────────────────────────────────────────────
export function analyzeText(text: string): TextBoosts {
  const lower = text.toLowerCase();

  const genreIds:        number[] = [];
  const excludeGenreIds: number[] = [];
  const overrides:       Partial<DiscoverParams> = {};

  // Process genre rules — separate positive matches from negated ones
  for (const rule of GENRE_RULES) {
    if (matchesNegative(lower, rule.patterns)) {
      excludeGenreIds.push(...rule.genreIds);
    } else if (matchesPositive(lower, rule.patterns)) {
      genreIds.push(...rule.genreIds);
    }
  }

  // Process override rules — skip if the whole phrase is negated
  for (const rule of OVERRIDE_RULES) {
    const matched = rule.patterns.find((p) => lower.includes(p));
    if (matched && !isNegated(lower, matched)) {
      Object.assign(overrides, rule.overrides);
    }
  }

  return {
    genreIds:        [...new Set(genreIds)],
    excludeGenreIds: [...new Set(excludeGenreIds)],
    overrides,
  };
}
