import type { DiscoverParams } from "@/types/tmdb";
import type { TextBoosts } from "./textAnalyzer";

// ─── Model fallback chain ─────────────────────────────────────────────────
// Tried in order — skips to the next on 429 / provider error.
// All are free tier on OpenRouter.
const MODEL_CHAIN = [
  "qwen/qwen3.6-plus:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-27b-it:free",
  "google/gemma-3-12b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
];

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
  "sortBy": "popularity.desc" | "vote_average.desc" | null
}

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
};

// ─── Single model call ────────────────────────────────────────────────────
async function tryModel(model: string, prompt: string): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type":  "application/json",
      "HTTP-Referer":  "https://cinemood.app",
      "X-Title":       "CineMood",
    },
    body: JSON.stringify({
      model,
      messages:    [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens:  300,
    }),
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

// ─── Main export — tries models in chain, throws only if all fail ─────────
export async function analyzeTextWithAI(text: string): Promise<TextBoosts> {
  const prompt = buildPrompt(text);
  let lastError: unknown;

  for (const model of MODEL_CHAIN) {
    try {
      const raw     = await tryModel(model, prompt);
      const cleaned = extractJSON(raw);
      const prefs   = JSON.parse(cleaned) as AIPreferences;

      const overrides: Partial<DiscoverParams> = {};
      if (prefs.maxRuntime != null) overrides["with_runtime.lte"]         = prefs.maxRuntime;
      if (prefs.minRuntime != null) overrides["with_runtime.gte"]         = prefs.minRuntime;
      if (prefs.yearAfter  != null) overrides["primary_release_date.gte"] = `${prefs.yearAfter}-01-01`;
      if (prefs.yearBefore != null) overrides["primary_release_date.lte"] = `${prefs.yearBefore}-12-31`;
      if (prefs.minRating  != null) overrides["vote_average.gte"]         = prefs.minRating;
      if (prefs.sortBy     != null) overrides["sort_by"]                  = prefs.sortBy;

      return {
        genreIds:        prefs.includeGenreIds ?? [],
        excludeGenreIds: prefs.excludeGenreIds ?? [],
        overrides,
      };
    } catch (err) {
      console.warn(`[aiTextAnalyzer] model ${model} failed:`, err);
      lastError = err;
      // Continue to next model in chain
    }
  }

  // All models failed — bubble up so recommendationEngine falls back to keywords
  throw lastError ?? new Error("All OpenRouter models failed");
}
