import type { DiscoverParams } from "@/types/tmdb";

/** What the user asked for, still as words. Resolved to TMDB ids by textResolver. */
export type TextIntent = {
  genreIds:        number[];   // genres to INCLUDE / boost
  excludeGenreIds: number[];   // genres to EXCLUDE from results
  overrides:       Partial<DiscoverParams>;
  keywords:        string[];   // themes / subgenres, in English as TMDB names them
  excludeKeywords: string[];
  similarTo:       string[];   // films the user named ("algo como Hereditary")
  examples:        string[];   // films that exemplify the request
  people:          string[];   // directors or actors the user named
};

export const EMPTY_INTENT: TextIntent = {
  genreIds: [], excludeGenreIds: [], overrides: {},
  keywords: [], excludeKeywords: [], similarTo: [], examples: [], people: [],
};

// ─── Subgenres and themes ──────────────────────────────────────────────────
// Used when no language model is available. TMDB keywords are in English, so
// each Spanish phrase maps to the keyword names that cover it. The most common
// subgenres also carry a few canonical films: keywords alone surface too many
// loosely tagged titles, and these anchor the search the way the model would.
const THEME_RULES: Array<{ patterns: string[]; keywords: string[]; examples?: string[] }> = [
  {
    patterns: ["terror analogico", "terror analógico", "analog horror"],
    keywords: ["analog horror", "found footage", "vhs"],
    examples: ["The Blair Witch Project (1999)", "Lake Mungo (2008)", "Noroi: The Curse (2005)", "Skinamarink (2022)", "V/H/S (2012)", "Hell House LLC (2015)", "Late Night with the Devil (2024)"],
  },
  {
    patterns: ["metraje encontrado", "found footage", "camara en mano", "cámara en mano"],
    keywords: ["found footage"],
    examples: ["[REC] (2007)", "Paranormal Activity (2007)", "The Blair Witch Project (1999)", "Cloverfield (2008)", "Creep (2014)"],
  },
  { patterns: ["falso documental", "mockumentary"], keywords: ["mockumentary"], examples: ["This Is Spinal Tap (1984)", "What We Do in the Shadows (2014)", "Borat (2006)", "Man Bites Dog (1992)"] },
  { patterns: ["slasher", "asesino en serie", "serial killer"], keywords: ["slasher", "serial killer"], examples: ["Halloween (1978)", "Scream (1996)", "The Texas Chain Saw Massacre (1974)", "X (2022)", "Se7en (1995)"] },
  { patterns: ["zombi", "zombie", "muertos vivientes"], keywords: ["zombie"], examples: ["Dawn of the Dead (1978)", "28 Days Later (2002)", "Train to Busan (2016)", "Shaun of the Dead (2004)", "Night of the Living Dead (1968)"] },
  { patterns: ["vampir"], keywords: ["vampire"], examples: ["Let the Right One In (2008)", "Nosferatu (1922)", "Interview with the Vampire (1994)", "What We Do in the Shadows (2014)"] },
  { patterns: ["fantasma", "casa encantada", "paranormal"], keywords: ["ghost", "haunted house"], examples: ["The Others (2001)", "The Conjuring (2013)", "The Haunting (1963)", "The Orphanage (2007)", "Ju-on: The Grudge (2002)"] },
  { patterns: ["terror folk", "folk horror", "secta", "culto"], keywords: ["folk horror", "cult"], examples: ["The Wicker Man (1973)", "Midsommar (2019)", "The Witch (2015)", "Kill List (2011)"] },
  { patterns: ["terror corporal", "body horror"], keywords: ["body horror"], examples: ["The Fly (1986)", "Videodrome (1983)", "The Substance (2024)", "Tetsuo: The Iron Man (1989)", "Titane (2021)"] },
  { patterns: ["viajes en el tiempo", "viaje en el tiempo", "time travel", "bucle temporal"], keywords: ["time travel", "time loop"], examples: ["Back to the Future (1985)", "Primer (2004)", "Groundhog Day (1993)", "Predestination (2014)", "12 Monkeys (1995)"] },
  { patterns: ["cyberpunk", "ciberpunk"], keywords: ["cyberpunk"], examples: ["Blade Runner (1982)", "Ghost in the Shell (1995)", "Akira (1988)", "The Matrix (1999)"] },
  { patterns: ["distop", "dystopia"], keywords: ["dystopia"] },
  { patterns: ["postapocal", "post-apocal", "apocalip"], keywords: ["post-apocalyptic future"] },
  { patterns: ["espacio", "espacial", "astronauta", "space"], keywords: ["space", "astronaut"] },
  { patterns: ["inteligencia artificial", "robots", "androide"], keywords: ["artificial intelligence (a.i.)", "android"] },
  { patterns: ["cine negro", "noir"], keywords: ["film noir", "neo-noir"] },
  { patterns: ["atraco", "robo", "heist"], keywords: ["heist"] },
  { patterns: ["juicio", "abogados", "tribunal"], keywords: ["courtroom"] },
  { patterns: ["samur"], keywords: ["samurai"] },
  { patterns: ["artes marciales", "kung fu", "kung-fu"], keywords: ["martial arts", "kung fu"] },
  { patterns: ["mafia", "gangster", "gánster"], keywords: ["mafia", "gangster"] },
  { patterns: ["espías", "espias", "espionaje"], keywords: ["spy", "espionage"] },
  { patterns: ["venganza"], keywords: ["revenge"] },
  { patterns: ["road movie", "viaje por carretera"], keywords: ["road trip"] },
  { patterns: ["adolescen", "instituto", "coming of age"], keywords: ["coming of age", "high school"] },
  { patterns: ["navidad", "navideñ"], keywords: ["christmas"] },
  { patterns: ["deporte", "boxeo", "fútbol", "futbol"], keywords: ["sports"] },
  { patterns: ["basada en hechos reales", "hechos reales", "historia real", "biopic", "biográfica"], keywords: ["based on true story", "biography"] },
  { patterns: ["anime"], keywords: ["anime"] },
  { patterns: ["stop motion", "stop-motion"], keywords: ["stop motion"] },
  { patterns: ["lgbt", "queer", "gay", "lesbian"], keywords: ["lgbt"] },
  { patterns: ["surreal", "onírica", "onirica", "rara", "extraña"], keywords: ["surrealism"] },
  { patterns: ["giro final", "plot twist", "final inesperado"], keywords: ["plot twist"] },
  { patterns: ["supervivencia", "survival"], keywords: ["survival"] },
  { patterns: ["monstruo", "kaiju"], keywords: ["monster", "kaiju"] },
  { patterns: ["extraterrestre", "alien", "ovni"], keywords: ["alien", "alien invasion"] },
];

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
export function analyzeText(text: string): TextIntent {
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

  const keywords:        string[] = [];
  const excludeKeywords: string[] = [];
  const examples:        string[] = [];
  for (const rule of THEME_RULES) {
    if (matchesNegative(lower, rule.patterns)) excludeKeywords.push(...rule.keywords);
    else if (matchesPositive(lower, rule.patterns)) {
      keywords.push(...rule.keywords);
      examples.push(...(rule.examples ?? []));
    }
  }

  // "algo como Hereditary", "parecida a Alien", "estilo Blade Runner"
  const reference = text.match(/(?:\bcomo|parecid[ao]s? a|similar(?:es)? a|\bestilo|\btipo)\s+(?:la |el |las |los )?([^,.;]{2,60})/i);

  return {
    ...EMPTY_INTENT,
    similarTo:       reference ? [reference[1].trim()] : [],
    genreIds:        [...new Set(genreIds)],
    excludeGenreIds: [...new Set(excludeGenreIds)],
    overrides,
    keywords:        [...new Set(keywords)],
    excludeKeywords: [...new Set(excludeKeywords)],
    examples:        [...new Set(examples)],
  };
}
