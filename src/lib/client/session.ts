import { MOOD_MAP } from "@/lib/mood/moodMap";
import type { TasteProfile } from "@/types/letterboxd";
import type { MoodCategory } from "@/types/mood";
import type { RecommendationsResponse } from "@/types/recommendation";

export const DRAFT_STORAGE_KEY = "movieasufeel_onboarding";
export const RESULTS_STORAGE_KEY = "movieasufeel_results";

export type ResultsQuery = {
  username: string;
  moods: MoodCategory[];
  freeText: string;
};

export type StoredResults = ResultsQuery & {
  profile: TasteProfile;
  result: RecommendationsResponse;
  round: number;
};

// ─── Shareable results URL ──────────────────────────────────────────────────
// /results?u=<letterboxd user>&m=happy,sad&t=<free text>

export function resultsHref({ username, moods, freeText }: ResultsQuery): string {
  const params = new URLSearchParams({ u: username, m: moods.join(",") });
  if (freeText.trim()) params.set("t", freeText.trim());
  return `/results?${params.toString()}`;
}

export function parseResultsQuery(params: URLSearchParams): ResultsQuery | null {
  const username = params.get("u")?.trim() ?? "";
  const moods = (params.get("m") ?? "")
    .split(",")
    .filter((m): m is MoodCategory => m in MOOD_MAP)
    .slice(0, 3);
  if (!username || moods.length === 0) return null;
  return { username, moods, freeText: params.get("t")?.slice(0, 500) ?? "" };
}

export function sameQuery(a: ResultsQuery, b: ResultsQuery): boolean {
  return a.username.toLowerCase() === b.username.toLowerCase()
    && a.moods.join(",") === b.moods.join(",")
    && a.freeText.trim() === b.freeText.trim();
}

// ─── sessionStorage helpers (never throw) ───────────────────────────────────

export function readSession<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeSession(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked — the app still works, it just won't restore.
  }
}

// ─── API calls ──────────────────────────────────────────────────────────────

async function readJson(res: Response): Promise<{ error?: string } & Record<string, unknown>> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function fetchProfile(username: string): Promise<TasteProfile> {
  let res: Response;
  try {
    res = await fetch(`/api/letterboxd?username=${encodeURIComponent(username.trim())}`);
  } catch {
    throw new Error("No hay conexión. Revisa tu red y vuelve a intentarlo.");
  }
  const data = await readJson(res);
  if (!res.ok) throw new Error(data.error ?? "No se pudo cargar el perfil.");
  return data as unknown as TasteProfile;
}

export async function fetchRecommendations(
  profile: TasteProfile,
  moods: MoodCategory[],
  freeText: string,
  {
    round = 0,
    excludeIds = [],
    watchlistIds = [],
  }: { round?: number; excludeIds?: number[]; watchlistIds?: number[] } = {}
): Promise<RecommendationsResponse> {
  let res: Response;
  try {
    res = await fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tasteProfile: profile,
        moodInput: { categories: moods, freeText: freeText.trim() || undefined },
        round,
        excludeIds,
        watchlistIds,
      }),
    });
  } catch {
    throw new Error("No hay conexión. Revisa tu red y vuelve a intentarlo.");
  }
  const data = await readJson(res);
  if (!res.ok) throw new Error(data.error ?? "No se pudieron generar recomendaciones.");
  return data as unknown as RecommendationsResponse;
}
