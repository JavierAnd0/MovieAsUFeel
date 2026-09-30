import type { DiscoverParams } from "@/types/tmdb";
import { EMPTY_INTENT, type TextIntent } from "./textAnalyzer";

// ─── Model fallback chain ─────────────────────────────────────────────────
// Tried in order — skips to the next on 429 / provider error.
// Free models on OpenRouter are retired without notice: when every request
// falls back to the keyword analyzer, this list is the first thing to check
// (https://openrouter.ai/models?max_price=0). OPENROUTER_MODELS overrides it
// without a deploy, as a comma-separated list.
const DEFAULT_MODEL_CHAIN = [
  "qwen/qwen3.8-27b:free",
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
  "dots-studio/dots-3-note-preview:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
];

function modelChain(): string[] {
  const fromEnv = (process.env.OPENROUTER_MODELS ?? "").split(",").map((m) => m.trim()).filter(Boolean);
  return fromEnv.length > 0 ? fromEnv : DEFAULT_MODEL_CHAIN;
}

// ─── TMDB genre reference ─────────────────────────────────────────────────
const GENRE_MAP =
  "28=Action,12=Adventure,16=Animation,35=Comedy,80=Crime," +
  "99=Documentary,18=Drama,10751=Family,14=Fantasy,36=History," +
  "27=Horror,10402=Music,9648=Mystery,10749=Romance,878=SciFi," +
  "53=Thriller,10752=War,37=Western";

const currentYear = new Date().getFullYear();

// ─── Single-turn prompt (works on all models — no system role needed) ─────
function buildPrompt(userText: string): string {
  return `You are a movie preference extractor for a recommendation engine.
Extract structured preferences from the user's request and return ONLY a valid JSON object — no markdown, no explanation.

TMDB genre IDs: ${GENRE_MAP}

Return exactly this shape:
{
  "includeGenreIds": number[],
  "excludeGenreIds": number[],
  "maxRuntime": number | null,
  "minRuntime": number | null,
  "yearAfter":  number | null,
  "yearBefore": number | null,
  "minRating":  number | null,
  "sortBy": "popularity.desc" | "vote_average.desc" | null,
  "language": string | null,
  "keywords": string[],
  "excludeKeywords": string[],
  "similarTo": string[],
  "examples": string[],
  "people": string[]
}

Field guide:
- keywords: 3-6 ENGLISH keywords as used on TMDB for the subgenre, theme, setting or style requested, the exact term first and then close neighbours. Lowercase, 1-3 words each. E.g. "terror analógico" → ["analog horror","found footage","vhs","mockumentary","lost tape"]; "viajes en el tiempo" → ["time travel","time loop"]; "cine negro" → ["film noir","neo-noir"]. Empty if the request is only about genre, length, era or rating.
- excludeKeywords: same format, for themes the user rejects.
- similarTo: film titles the user explicitly names as a reference ("algo como Hereditary" → ["Hereditary"]). Never invent these.
- examples: 5-8 real feature films that best fit the whole request, as "Title (year)" with the original title. REQUIRED whenever keywords, similarTo or people is non-empty — these films are the most important part of the answer. Prefer well-regarded and varied picks. Empty only for generic requests (just a genre, length, era or rating).
- includeGenreIds: always include the genre when the request names or implies one ("terror analógico" → [27]).
- people: directors or actors the user names.
- language: ISO 639-1 code of the ORIGINAL language when the user asks for a national cinema ("coreana" → "ko", "cine francés" → "fr", "anime/japonesa" → "ja", "española/en español" → "es"). Otherwise null.

Rules (apply in any language):
- negation ("no terror", "sin romance", "nada de", "without", "not") → excludeGenreIds
- "short/corta/breve/no muy larga/not too long" → maxRuntime: 100
- "long/larga/epic/épica" → minRuntime: 130
- "recent/nueva/reciente/moderna/estreno" → yearAfter: ${currentYear - 3}
- "classic/clásica/old/vintage/antigua" → yearBefore: 1995
- "80s/años 80/ochenta" → yearAfter: 1980, yearBefore: 1989
- "90s/años 90/noventa" → yearAfter: 1990, yearBefore: 1999
- "2000s/años 2000" → yearAfter: 2000, yearBefore: 2009
- "oscar/premiada/acclaimed/masterpiece/obra maestra" → minRating: 7.5, sortBy: "vote_average.desc"
- "popular/blockbuster/taquilla" → sortBy: "popularity.desc"
- superhero/marvel/dc → includeGenreIds: [28,12]
- "for kids/para niños/familiar/infantil" → includeGenreIds: [10751]
- "not for kids/no infantil/adulta/para adultos" → excludeGenreIds: [10751,16]
- empty arrays are better than wrong guesses

User request: "${userText}"`;
}

// ─── Structured response type ─────────────────────────────────────────────
type AIPreferences = {
  includeGenreIds: number[];
  excludeGenreIds: number[];
  maxRuntime:      number | null;
  minRuntime:      number | null;
  yearAfter:       number | null;
  yearBefore:      number | null;
  minRating:       number | null;
  sortBy:          "popularity.desc" | "vote_average.desc" | null;
  language?:        string | null;
  keywords?:        string[];
  excludeKeywords?: string[];
  similarTo?:       string[];
  examples?:        string[];
  people?:          string[];
};

const MODEL_TIMEOUT_MS = 7000;
const TOTAL_BUDGET_MS = 12000;

const strings = (value: unknown, max: number): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 1).map((v) => v.trim().slice(0, 80)).slice(0, max)
    : [];

const genreIdList = (value: unknown): number[] =>
  Array.isArray(value) ? value.filter((v): v is number => Number.isInteger(v)).slice(0, 6) : [];

// ─── Single model call ────────────────────────────────────────────────────
async function tryModel(model: string, prompt: string): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type":  "application/json",
      "X-Title":       "MovieAsUFeel",
    },
    body: JSON.stringify({
      model,
      messages:    [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens:  700,
      // Extraction needs no deliberation; thinking only adds seconds
      reasoning:   { effort: "none", exclude: true },
    }),
    signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
  });

  const result = await response.json();

  // Surface provider errors so the caller can try the next model
  if (!response.ok || result.error) {
    const msg = result?.error?.message ?? `HTTP ${response.status}`;
    throw new Error(msg);
  }

  const content: string = result.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("Empty response from model");
  return content;
}

// ─── Parse raw text → clean JSON string ──────────────────────────────────
function extractJSON(raw: string): string {
  // Strip markdown fences if the model wrapped the JSON
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  // Find first { … } block
  const start = raw.indexOf("{");
  const end   = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1) return raw.slice(start, end + 1);

  return raw.trim();
}

// ─── One model: prompt → validated intent ────────────────────────────────
async function askModel(model: string, prompt: string): Promise<TextIntent> {
  try {
    const prefs = JSON.parse(extractJSON(await tryModel(model, prompt))) as AIPreferences;

    const overrides: Partial<DiscoverParams> = {};
    if (prefs.maxRuntime != null) overrides["with_runtime.lte"]         = prefs.maxRuntime;
    if (prefs.minRuntime != null) overrides["with_runtime.gte"]         = prefs.minRuntime;
    if (prefs.yearAfter  != null) overrides["primary_release_date.gte"] = `${prefs.yearAfter}-01-01`;
    if (prefs.yearBefore != null) overrides["primary_release_date.lte"] = `${prefs.yearBefore}-12-31`;
    if (prefs.minRating  != null) overrides["vote_average.gte"]         = prefs.minRating;
    if (prefs.sortBy     != null) overrides["sort_by"]                  = prefs.sortBy;
    if (typeof prefs.language === "string" && /^[a-z]{2}$/.test(prefs.language)) {
      overrides["with_original_language"] = prefs.language;
    }

    return {
      ...EMPTY_INTENT,
      genreIds:        genreIdList(prefs.includeGenreIds),
      excludeGenreIds: genreIdList(prefs.excludeGenreIds),
      overrides,
      keywords:        strings(prefs.keywords, 8),
      excludeKeywords: strings(prefs.excludeKeywords, 8),
      similarTo:       strings(prefs.similarTo, 4),
      examples:        strings(prefs.examples, 8),
      people:          strings(prefs.people, 3),
    };
  } catch (err) {
    console.warn(`[aiTextAnalyzer] model ${model} failed:`, err instanceof Error ? err.message : err);
    throw err;
  }
}

// ─── Main export — throws only if every model fails ───────────────────────
// Free endpoints are often rate-limited, slow, or lazy (a quick answer with
// half the fields empty). So the first few models are asked at once; after the
// first valid answer the others get a short grace period, and the most
// complete answer wins. The rest of the chain is a backstop.
const RACE_SIZE = 3;
const GRACE_MS = 2500;

/** More concrete material to search with = a more useful answer. */
const richness = (intent: TextIntent) =>
  intent.examples.length * 2 + intent.keywords.length + intent.similarTo.length * 2 +
  intent.people.length * 2 + intent.genreIds.length + Object.keys(intent.overrides).length;

function raceForBest(models: string[], prompt: string): Promise<TextIntent> {
  return new Promise((resolve, reject) => {
    const answers: TextIntent[] = [];
    let pending = models.length;
    let settled = false;
    let lastError: unknown;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (answers.length === 0) reject(lastError ?? new Error("No model answered"));
      else resolve(answers.reduce((best, a) => (richness(a) > richness(best) ? a : best)));
    };

    for (const model of models) {
      askModel(model, prompt)
        .then((intent) => {
          answers.push(intent);
          if (answers.length === 1) setTimeout(finish, GRACE_MS);
        })
        .catch((err) => { lastError = err; })
        .finally(() => { if (--pending === 0) finish(); });
    }
  });
}

export async function analyzeTextWithAI(text: string): Promise<TextIntent> {
  const prompt = buildPrompt(text);
  const chain = modelChain();
  const startedAt = Date.now();

  let lastError: unknown;
  try {
    return await raceForBest(chain.slice(0, RACE_SIZE), prompt);
  } catch (err) {
    lastError = err; // every racer failed — fall through to the remaining models
  }

  for (const model of chain.slice(RACE_SIZE)) {
    if (Date.now() - startedAt > TOTAL_BUDGET_MS) break;
    try {
      return await askModel(model, prompt);
    } catch (err) {
      lastError = err;
    }
  }

  // All models failed — bubble up so recommendationEngine falls back to keywords
  throw lastError ?? new Error("All OpenRouter models failed");
}
