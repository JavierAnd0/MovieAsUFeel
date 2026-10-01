import type { DiscoverParams } from "@/types/tmdb";
import { EMPTY_INTENT, type TextIntent } from "./textAnalyzer";

// ─── Model chain ──────────────────────────────────────────────────────────
// Gemini (Google AI Studio's own free tier) goes first when GEMINI_API_KEY is
// set; OpenRouter's free models are the backstop. Each provider's list can be
// replaced without a deploy via GEMINI_MODELS / OPENROUTER_MODELS
// (comma-separated). Free models get retired without notice: when every
// request falls back to the keyword analyzer, these lists are the first thing
// to check.
type Provider = "gemini" | "openrouter";
type ModelRef = { provider: Provider; model: string };

const DEFAULT_GEMINI_MODELS = ["gemini-3.5-flash-lite", "gemini-3.5-flash"];

const DEFAULT_OPENROUTER_MODELS = [
  "qwen/qwen3.8-27b:free",
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
  "dots-studio/dots-3-note-preview:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
];

const listFromEnv = (value: string | undefined, fallback: string[]) => {
  const list = (value ?? "").split(",").map((m) => m.trim()).filter(Boolean);
  return list.length > 0 ? list : fallback;
};

function modelChain(): ModelRef[] {
  return [
    ...(process.env.GEMINI_API_KEY
      ? listFromEnv(process.env.GEMINI_MODELS, DEFAULT_GEMINI_MODELS).map((model) => ({ provider: "gemini" as const, model }))
      : []),
    ...(process.env.OPENROUTER_API_KEY
      ? listFromEnv(process.env.OPENROUTER_MODELS, DEFAULT_OPENROUTER_MODELS).map((model) => ({ provider: "openrouter" as const, model }))
      : []),
  ];
}

/** Whether any language model is configured for the free-text field. */
export const hasTextModel = () => Boolean(process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY);

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

/**
 * A free-tier quota is used up. `scope` says what is out: the whole provider
 * (OpenRouter's quota is per account) or just one model (Gemini's is per model).
 */
class QuotaExhaustedError extends Error {
  constructor(message: string, readonly scope: string) {
    super(message);
  }
}

// ─── Gemini (Interactions API) ────────────────────────────────────────────
/** Collects every text part in the response, wherever the API nests it. */
function collectText(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) node.forEach((n) => collectText(n, out));
  else if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (typeof o.text === "string" && (o.type === undefined || o.type === "text")) out.push(o.text);
    else Object.values(o).forEach((v) => collectText(v, out));
  }
  return out;
}

async function callGemini(model: string, prompt: string): Promise<string> {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "x-goog-api-key": process.env.GEMINI_API_KEY ?? "",
      "Content-Type":   "application/json",
    },
    body: JSON.stringify({
      model,
      input: prompt,
      store: false,
      generation_config: {
        temperature: 0,
        max_output_tokens: 800,
        // Extraction needs no deliberation. 3.x flash-lite accepts "minimal"; others start at "low".
        thinking_level: /^gemini-3.*flash-lite/.test(model) ? "minimal" : "low",
      },
    }),
    signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.error) {
    const msg: string = result?.error?.message ?? `HTTP ${response.status}`;
    if (response.status === 429 || result?.error?.status === "RESOURCE_EXHAUSTED") {
      throw new QuotaExhaustedError(msg, `gemini:${model}`);
    }
    throw new Error(msg);
  }

  const content = collectText(result.steps ?? result.outputs ?? result).join("");
  if (!content) throw new Error("Empty response from model");
  return content;
}

// ─── OpenRouter ───────────────────────────────────────────────────────────
async function callOpenRouter(model: string, prompt: string): Promise<string> {
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
    const msg: string = result?.error?.message ?? `HTTP ${response.status}`;
    // The daily free quota is per account, not per model: every other model would fail too
    if (/per-day|daily|credits/i.test(msg)) throw new QuotaExhaustedError(msg, "openrouter");
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
async function askModel({ provider, model }: ModelRef, prompt: string): Promise<TextIntent> {
  try {
    const raw = provider === "gemini" ? await callGemini(model, prompt) : await callOpenRouter(model, prompt);
    const prefs = JSON.parse(extractJSON(raw)) as AIPreferences;

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
    console.warn(`[aiTextAnalyzer] ${provider} ${model} failed:`, err instanceof Error ? err.message : err);
    throw err;
  }
}

// ─── Main export — throws only if every model fails ───────────────────────
// Free tiers come with small request quotas, so models are asked one at a
// time and the first good answer wins. An answer that names themes but no
// example films is "lazy"; one more model gets a chance to do better before
// we settle for it.
//
// When a quota runs out, that scope (a Gemini model, or all of OpenRouter)
// keeps failing until it resets. Rather than spend seconds on doomed calls for
// each search, it is skipped for a while.
const QUOTA_PAUSE_MS = 30 * 60 * 1000;
const pausedUntil = new Map<string, number>();

const isPaused = ({ provider, model }: ModelRef) => {
  const now = Date.now();
  return (pausedUntil.get(provider) ?? 0) > now || (pausedUntil.get(`${provider}:${model}`) ?? 0) > now;
};

const isLazy = (intent: TextIntent) =>
  intent.examples.length === 0 &&
  (intent.keywords.length > 0 || intent.similarTo.length > 0 || intent.people.length > 0);

export async function analyzeTextWithAI(text: string): Promise<TextIntent> {
  const chain = modelChain().filter((ref) => !isPaused(ref));
  if (chain.length === 0) throw new Error("No language model available (none configured, or all paused for quota)");

  const prompt = buildPrompt(text);
  const startedAt = Date.now();
  let fallback: TextIntent | null = null;
  let lastError: unknown;

  for (const ref of chain) {
    if (Date.now() - startedAt > TOTAL_BUDGET_MS) break;
    if (isPaused(ref)) continue; // a provider-wide quota may have run out mid-loop
    try {
      const intent = await askModel(ref, prompt);
      if (!isLazy(intent)) return intent;
      if (fallback) return fallback; // second lazy answer: stop spending quota
      fallback = intent;
    } catch (err) {
      lastError = err;
      if (err instanceof QuotaExhaustedError) pausedUntil.set(err.scope, Date.now() + QUOTA_PAUSE_MS);
    }
  }

  if (fallback) return fallback;
  // All models failed — bubble up so recommendationEngine falls back to keywords
  throw lastError ?? new Error("All language models failed");
}
