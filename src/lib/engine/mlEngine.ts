/**
 * ML Recommendation Engine — SVD-based collaborative filtering.
 *
 * Loads pre-trained movie latent vectors (produced by ml/scripts/2_train.py)
 * and computes personalized recommendations at runtime using the user's
 * Letterboxd ratings.
 *
 * Algorithm:
 *   1. Load movie_vectors.json + catalog_meta.json from ml/data/artifacts/
 *   2. Build user vector = weighted sum of rated movies' vectors
 *      (weights = centered ratings: rating - user_mean)
 *   3. Score every catalog movie via cosine similarity to user vector
 *   4. Apply mood boost (multiplicative) on genre-aligned movies
 *   5. Return top 5 with genre diversity + personalized blurbs
 *
 * Falls back to null (→ caller uses existing TMDB engine) when:
 *   - Artifacts not found (not trained yet)
 *   - User has < 3 films with ML vectors (cold start)
 */

import fs from "fs";
import path from "path";

import { MOOD_MAP } from "@/lib/mood/moodMap";
import { analyzeText } from "@/lib/mood/textAnalyzer";
import { tmdbMovieUrl } from "@/lib/tmdb/client";
import type { TasteProfile, TopRatedFilm } from "@/types/letterboxd";
import type { MoodInput, MoodSignal } from "@/types/mood";
import type { RecommendedMovie, RecommendationsResponse } from "@/types/recommendation";

// ── Types ─────────────────────────────────────────────────────────────────────

type MovieVectors = Record<string, number[]>;  // tmdbId → float[k]

type CatalogEntry = {
  title:        string;
  year:         number;
  genres:       number[];
  vote_average: number;
  poster_path:  string | null;
};

type CatalogMeta = Record<string, CatalogEntry>; // tmdbId → metadata

// ── Artifact loading (lazy, module-level cache) ───────────────────────────────

let _vectors:  MovieVectors | null = null;
let _meta:     CatalogMeta  | null = null;
let _loaded = false;

function loadArtifacts(): boolean {
  if (_loaded) return _vectors !== null;

  _loaded = true;
  const base  = path.join(process.cwd(), "ml", "data", "artifacts");
  const vPath = path.join(base, "movie_vectors.json");
  const mPath = path.join(base, "catalog_meta.json");

  if (!fs.existsSync(vPath) || !fs.existsSync(mPath)) {
    console.info("[mlEngine] Artifacts not found — using fallback engine.");
    return false;
  }

  try {
    _vectors = JSON.parse(fs.readFileSync(vPath, "utf8")) as MovieVectors;
    _meta    = JSON.parse(fs.readFileSync(mPath, "utf8")) as CatalogMeta;
    const n  = Object.keys(_vectors).length;
    const k  = Object.values(_vectors)[0]?.length ?? 0;
    console.info(`[mlEngine] Loaded ${n} movie vectors (k=${k}).`);
    return true;
  } catch (err) {
    console.error("[mlEngine] Failed to load artifacts:", err);
    _vectors = null;
    _meta    = null;
    return false;
  }
}

// ── Math helpers ──────────────────────────────────────────────────────────────

function dotProduct(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function norm(v: number[]): number {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}

function cosineSimilarity(a: number[], b: number[]): number {
  const na = norm(a);
  const nb = norm(b);
  return na > 0 && nb > 0 ? dotProduct(a, b) / (na * nb) : 0;
}

// ── User vector ───────────────────────────────────────────────────────────────

/**
 * Computes the user's preference vector as a weighted sum of the latent
 * vectors of their rated movies.
 *
 * Weight = (rating - user_mean), so:
 *   - Loved films (5★) pull the vector strongly toward their region
 *   - Disliked films (1★) pull away from their region
 *   - Neutral films (~mean) contribute almost nothing
 *
 * Returns null when fewer than MIN_RATED_WITH_VECTOR films are available
 * (cold-start: fall back to TMDB engine).
 */
const MIN_RATED_WITH_VECTOR = 3;

function computeUserVector(
  topRatedFilms: TopRatedFilm[],
  vectors: MovieVectors
): number[] | null {
  // Gather all films the user has rated (including lower-rated ones for contrast)
  const withVectors = topRatedFilms
    .map((f) => ({ film: f, vec: vectors[String(f.tmdbId)] }))
    .filter((x) => x.vec !== undefined);

  if (withVectors.length < MIN_RATED_WITH_VECTOR) return null;

  const k = withVectors[0].vec.length;
  const userVector = new Array<number>(k).fill(0);

  const ratings = withVectors.map((x) => x.film.rating);
  const meanRating = ratings.reduce((s, r) => s + r, 0) / ratings.length;

  let totalWeight = 0;
  for (const { film, vec } of withVectors) {
    const w = film.rating - meanRating; // centered weight
    for (let i = 0; i < k; i++) userVector[i] += w * vec[i];
    totalWeight += Math.abs(w);
  }

  if (totalWeight === 0) return null;

  // Normalize
  for (let i = 0; i < k; i++) userVector[i] /= totalWeight;
  return userVector;
}

// ── Mood helpers ──────────────────────────────────────────────────────────────

function buildMoodSignal(moodInput: MoodInput): MoodSignal {
  const signals = moodInput.categories.map((c) => MOOD_MAP[c]);
  if (signals.length === 1) return signals[0];

  return {
    genres:   [...new Set(signals.flatMap((s) => s.genres))],
    keywords: [...new Set(signals.flatMap((s) => s.keywords))],
    sortBy:   signals.some((s) => s.sortBy === "vote_average.desc")
                ? "vote_average.desc" : "popularity.desc",
    voteThreshold: signals.reduce((s, sig) => s + sig.voteThreshold, 0) / signals.length,
    toneLabel: signals.map((s) => s.toneLabel).join(" / "),
  };
}

// ── Scoring ───────────────────────────────────────────────────────────────────

type ScoredMovie = {
  tmdbId:       number;
  meta:         CatalogEntry;
  tasteScore:   number;
  moodScore:    number;
  finalScore:   number;
  triggeredBy?: string;
};

function scoreMovies(
  userVector:   number[],
  vectors:      MovieVectors,
  meta:         CatalogMeta,
  watchedSet:   Set<number>,
  moodGenreIds: number[],
  topRatedFilms: TopRatedFilm[],
): ScoredMovie[] {
  const scored: ScoredMovie[] = [];

  for (const [tmdbIdStr, vec] of Object.entries(vectors)) {
    const tmdbId = parseInt(tmdbIdStr);
    if (watchedSet.has(tmdbId)) continue;

    const entry = meta[tmdbIdStr];
    if (!entry || !entry.poster_path) continue;

    // Core taste score: cosine similarity in latent space
    const tasteScore = cosineSimilarity(userVector, vec);

    // Mood score: fraction of movie genres that match current mood
    const moodOverlap = entry.genres.filter((g) => moodGenreIds.includes(g)).length;
    const moodScore   = moodGenreIds.length > 0
      ? moodOverlap / moodGenreIds.length
      : 0;

    // Quality score: normalized TMDB vote_average
    const qualityScore = Math.max(0, Math.min(1, (entry.vote_average - 5) / 5));

    // Mood is a multiplicative boost on tasteScore (amplifies, doesn't replace)
    const moodBoost  = 1.0 + moodScore * 0.40;
    const finalScore = tasteScore * moodBoost * 0.70 + qualityScore * 0.30;

    scored.push({ tmdbId, meta: entry, tasteScore, moodScore, finalScore });
  }

  // Enrich with triggeredBy: find which user film is closest in latent space
  const userFilmsWithVec = topRatedFilms
    .map((f) => ({ title: f.title, vec: vectors[String(f.tmdbId)] }))
    .filter((x) => x.vec !== undefined);

  if (userFilmsWithVec.length > 0) {
    for (const s of scored) {
      const vec = vectors[String(s.tmdbId)];
      if (!vec) continue;
      let bestSim  = -Infinity;
      let bestTitle = "";
      for (const { title, vec: uVec } of userFilmsWithVec) {
        const sim = cosineSimilarity(vec, uVec);
        if (sim > bestSim) { bestSim = sim; bestTitle = title; }
      }
      if (bestTitle) s.triggeredBy = bestTitle;
    }
  }

  return scored;
}

// ── Genre diversity ───────────────────────────────────────────────────────────

function pickWithDiversity(
  sorted: ScoredMovie[],
  n: number,
  maxPerGenre = 2
): ScoredMovie[] {
  const genreCount = new Map<number, number>();
  const picked: ScoredMovie[] = [];

  for (const s of sorted) {
    if (picked.length >= n) break;
    const primaryGenre = s.meta.genres[0];
    const count = genreCount.get(primaryGenre) ?? 0;
    if (count < maxPerGenre) {
      picked.push(s);
      genreCount.set(primaryGenre, count + 1);
    }
  }

  // Relax constraint if we didn't fill up
  for (const s of sorted) {
    if (picked.length >= n) break;
    if (!picked.find((p) => p.tmdbId === s.tmdbId)) picked.push(s);
  }

  return picked;
}

// ── Blurb ─────────────────────────────────────────────────────────────────────

// TMDB genre ID → Spanish name (local map to avoid extra API call)
const GENRE_ES: Record<number, string> = {
  28: "acción", 12: "aventura", 16: "animación", 35: "comedia", 80: "crimen",
  99: "documental", 18: "drama", 10751: "familiar", 14: "fantasía",
  36: "historia", 27: "terror", 10402: "música", 9648: "misterio",
  10749: "romance", 878: "ciencia ficción", 53: "thriller",
  10752: "bélica", 37: "western",
};

function buildBlurb(s: ScoredMovie, moodSignal: MoodSignal): string {
  const genre = GENRE_ES[s.meta.genres[0]] ?? "película";
  const year  = s.meta.year ? ` de ${s.meta.year}` : "";
  const qual  = s.meta.vote_average >= 7.5 ? ", muy valorada" : "";

  if (s.triggeredBy) {
    return `Porque te gustó "${s.triggeredBy}" — ${genre}${year}${qual}.`;
  }
  return `${genre}${year} que encaja con un momento ${moodSignal.toneLabel}${qual}.`;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function mlRecommend(
  tasteProfile: TasteProfile,
  moodInput:    MoodInput
): RecommendationsResponse | null {

  // 1. Load artifacts (cached after first call)
  if (!loadArtifacts() || !_vectors || !_meta) return null;

  // 2. Compute user vector
  const userVector = computeUserVector(tasteProfile.topRatedFilms, _vectors);
  if (!userVector) {
    console.info("[mlEngine] Cold start — fewer than 3 rated films with vectors.");
    return null;
  }

  // 3. Build mood signal
  const moodSignal = buildMoodSignal(moodInput);
  const textBoosts = moodInput.freeText ? analyzeText(moodInput.freeText) : { genreIds: [] };
  const moodGenreIds = [...new Set([...moodSignal.genres, ...textBoosts.genreIds])];

  // 4. Score all movies
  const watchedSet = new Set(tasteProfile.watchedTmdbIds);
  const scored = scoreMovies(
    userVector, _vectors, _meta, watchedSet, moodGenreIds, tasteProfile.topRatedFilms
  );

  const totalCandidates = Object.keys(_vectors).length;
  const filteredOut     = watchedSet.size;

  // 5. Sort + diversity + top 5
  scored.sort((a, b) => b.finalScore - a.finalScore);
  const top5 = pickWithDiversity(scored, 5);

  // 6. Shape into response
  const movies: RecommendedMovie[] = top5.map((s) => ({
    tmdbId:      s.tmdbId,
    title:       s.meta.title,
    year:        s.meta.year,
    posterPath:  s.meta.poster_path,
    voteAverage: s.meta.vote_average,
    genres:      s.meta.genres.slice(0, 3).map((id) => ({
      id,
      name: GENRE_ES[id] ?? "",
    })).filter((g) => g.name),
    overview:    "",            // not stored in catalog_meta to keep file small
    blurb:       buildBlurb(s, moodSignal),
    score:       Math.round(s.finalScore * 1000) / 1000,
    tmdbUrl:     tmdbMovieUrl(s.tmdbId),
    triggeredBy: s.triggeredBy,
  }));

  const genresUsed = [
    ...new Set(top5.flatMap((s) => s.meta.genres.slice(0, 1))),
  ].map((id) => GENRE_ES[id] ?? "").filter(Boolean).slice(0, 3);

  return {
    movies,
    meta: {
      mood:            moodSignal.toneLabel,
      genresUsed,
      totalCandidates,
      filteredOut,
    },
  };
}
