import { NextRequest, NextResponse } from "next/server";
import { generateRecommendations } from "@/lib/engine/recommendationEngine";
import { MOOD_MAP } from "@/lib/mood/moodMap";
import type { TasteProfile } from "@/types/letterboxd";
import type { MoodInput } from "@/types/mood";

const MAX_FREE_TEXT_LENGTH = 500;
const MAX_WATCHED_IDS = 500;
const MAX_PROFILE_GENRES = 20;
const MAX_BODY_BYTES = 200_000;
const MAX_ROUND = 5;
const MAX_SEEDS = 12;
const MAX_EXCLUDED_IDS = 200;
const MAX_WATCHLIST_IDS = 150;
const VALID_MOODS = new Set(Object.keys(MOOD_MAP));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumberArray(value: unknown, maxLength: number): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is number => Number.isInteger(item) && item > 0)
    .slice(0, maxLength);
}

function sanitizeTasteProfile(value: unknown): TasteProfile | null {
  if (!isRecord(value)) return null;

  const username = typeof value.username === "string" ? value.username.trim() : "";
  const filmCount = typeof value.filmCount === "number" && Number.isFinite(value.filmCount)
    ? Math.max(0, Math.min(Math.round(value.filmCount), 100000))
    : 0;
  const avgRating = typeof value.avgRating === "number" && Number.isFinite(value.avgRating)
    ? Math.max(0, Math.min(value.avgRating, 5))
    : 0;
  const ratingBias = value.ratingBias === "picky" || value.ratingBias === "generous"
    ? value.ratingBias
    : "balanced";

  const topGenres = Array.isArray(value.topGenres)
    ? value.topGenres
        .filter(isRecord)
        .map((genre) => ({
          id: typeof genre.id === "number" && Number.isInteger(genre.id) ? genre.id : 0,
          name: typeof genre.name === "string" ? genre.name.slice(0, 80) : "",
          score: typeof genre.score === "number" && Number.isFinite(genre.score) ? genre.score : 0,
        }))
        .filter((genre) => genre.id > 0)
        .slice(0, MAX_PROFILE_GENRES)
    : [];

  if (!username || topGenres.length === 0) return null;

  const genreAffinity: Record<string, number> = {};
  if (isRecord(value.genreAffinity)) {
    for (const [id, affinity] of Object.entries(value.genreAffinity).slice(0, 40)) {
      if (/^\d{1,6}$/.test(id) && typeof affinity === "number" && Number.isFinite(affinity)) {
        genreAffinity[id] = Math.max(-1, Math.min(1, affinity));
      }
    }
  }

  const seeds = Array.isArray(value.seeds)
    ? value.seeds
        .filter(isRecord)
        .map((seed) => ({
          tmdbId: typeof seed.tmdbId === "number" && Number.isInteger(seed.tmdbId) ? seed.tmdbId : 0,
          title: typeof seed.title === "string" ? seed.title.slice(0, 200) : "",
          rating: typeof seed.rating === "number" && Number.isFinite(seed.rating)
            ? Math.max(0.5, Math.min(seed.rating, 5))
            : 4,
          genreIds: toNumberArray(seed.genreIds, 10),
        }))
        .filter((seed) => seed.tmdbId > 0 && seed.title)
        .slice(0, MAX_SEEDS)
    : [];

  const languages = Array.isArray(value.languages)
    ? value.languages.filter((l): l is string => typeof l === "string" && /^[a-z]{2,3}$/.test(l)).slice(0, 10)
    : [];

  return {
    username,
    filmCount,
    avgRating,
    ratingBias,
    topGenres,
    genreAffinity,
    seeds,
    languages,
    ...(typeof value.typicalVotes === "number" && Number.isFinite(value.typicalVotes) && value.typicalVotes > 0
      ? { typicalVotes: Math.round(value.typicalVotes) }
      : {}),
    topDirectors: Array.isArray(value.topDirectors)
      ? value.topDirectors.filter((name): name is string => typeof name === "string").slice(0, 20)
      : [],
    watchedTmdbIds: toNumberArray(value.watchedTmdbIds, MAX_WATCHED_IDS),
    recentGenres: toNumberArray(value.recentGenres, MAX_PROFILE_GENRES),
  };
}

function sanitizeMoodInput(value: unknown): MoodInput | null {
  if (!isRecord(value)) return null;

  const categories = Array.isArray(value.categories)
    ? value.categories.filter((category): category is MoodInput["categories"][number] => (
        typeof category === "string" && VALID_MOODS.has(category)
      ))
    : [];

  const uniqueCategories = [...new Set(categories)].slice(0, 3);
  if (uniqueCategories.length === 0) return null;

  const freeText = typeof value.freeText === "string"
    ? value.freeText.trim().slice(0, MAX_FREE_TEXT_LENGTH)
    : "";

  return {
    categories: uniqueCategories,
    ...(freeText ? { freeText } : {}),
  };
}

export async function POST(req: NextRequest) {
  let body: unknown;
  const contentLength = Number(req.headers.get("content-length") ?? 0);

  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "La petición es demasiado grande." }, { status: 413 });
  }

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "La petición no es válida." }, { status: 400 });
  }

  if (!isRecord(body) || !body.tasteProfile || !body.moodInput) {
    return NextResponse.json(
      { error: "Falta el perfil o el estado de ánimo." },
      { status: 400 }
    );
  }

  const tasteProfile = sanitizeTasteProfile(body.tasteProfile);
  const moodInput = sanitizeMoodInput(body.moodInput);

  if (!tasteProfile || !moodInput) {
    return NextResponse.json(
      { error: "El perfil o el estado de ánimo no son válidos. Vuelve a conectar tu Letterboxd." },
      { status: 400 }
    );
  }

  try {
    const round = typeof body.round === "number" && Number.isInteger(body.round)
      ? Math.max(0, Math.min(body.round, MAX_ROUND))
      : 0;
    const excludeIds = toNumberArray(body.excludeIds, MAX_EXCLUDED_IDS);
    const watchlistIds = toNumberArray(body.watchlistIds, MAX_WATCHLIST_IDS);
    const result = await generateRecommendations(tasteProfile, moodInput, { round, excludeIds, watchlistIds });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/recommendations] Failed to generate recommendations:", message);
    return NextResponse.json(
      { error: "No se pudieron generar recomendaciones ahora mismo. Inténtalo de nuevo en unos segundos." },
      { status: 500 }
    );
  }
}
