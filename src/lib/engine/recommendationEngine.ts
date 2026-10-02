import { discoverMovies, getGenreList, getMovieDetail, getMovieRecommendations, tmdbMovieUrl } from "@/lib/tmdb/client";
import { MOOD_MAP } from "@/lib/mood/moodMap";
import { KEYWORD_LABEL, mergeMoodProfiles, type MoodProfile } from "@/lib/mood/moodProfile";
import { analyzeText } from "@/lib/mood/textAnalyzer";
import { analyzeTextWithAI, hasTextModel } from "@/lib/mood/aiTextAnalyzer";
import { NO_TEXT, resolveTextIntent, type TextBoosts } from "@/lib/mood/textResolver";
import type { SeedFilm, TasteProfile } from "@/types/letterboxd";
import type { MoodInput } from "@/types/mood";
import type { TMDBMovie, DiscoverParams } from "@/types/tmdb";
import type { RecommendedMovie, RecommendationsResponse } from "@/types/recommendation";

/*
 * How a recommendation is made
 * ────────────────────────────
 * 1. Retrieve candidates from three independent sources:
 *      a. "more like the films you loved" — TMDB recommendations for the user's seeds
 *      b. films tagged with the mood's tone/theme keywords
 *      c. well-known films in the mood's genres
 *      d. whatever the user asked for in words: themes, reference films, people
 * 2. Score every candidate on taste, mood and quality using list data only.
 * 3. Load details (keywords, runtime) for the best ~50 and score them again,
 *    now with real evidence of tone.
 * 4. Pick the final list greedily, penalising near-duplicates so the result
 *    is varied rather than twelve versions of the same film.
 */

const WEIGHTS = { taste: 0.36, mood: 0.40, quality: 0.24 };
/** When the user asks for something specific, matching it is worth this share of the score. */
const TEXT_WEIGHT = 0.45;

const SEEDS_PER_ROUND = 6;
const FINALISTS_UNSEEN = 40;
const FINALISTS_SEEN = 12;
const RESULTS_UNSEEN = 12;
const RESULTS_SEEN = 8;
const MIN_VOTES = 80;
/** Niche requests ("terror analógico") live among little-voted films. */
const MIN_VOTES_TEXT = 15;
/** How much of the user's list is considered per request (most recent first). */
const WATCHLIST_MAX = 60;
const WATCHLIST_SEEDS = 2;
/** A film the user already wants to watch gets this nudge when it fits. */
const WATCHLIST_BONUS = 0.08;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

type Candidate = {
  movie: TMDBMovie;
  seeds: SeedFilm[];         // seeds whose recommendations include this film
  fromKeywords: boolean;     // came from the mood-keyword query
  onWatchlist: boolean;      // on the user's own list
  keywordHits?: number[];    // mood keywords confirmed on the film (after details load)
  // How the film relates to the user's free text
  text: { example: boolean; keywordSource: boolean; similarTo?: string; person?: string };
  textKeywordHits?: number;  // requested keywords confirmed on the film
  rejected?: boolean;        // carries a keyword the user asked to avoid
  runtime?: number | null;
  score: number;
  parts: { taste: number; mood: number; quality: number; text: number };
};

export type GenerateOptions = {
  /** 0 for the first batch; each extra round digs further into every source. */
  round?: number;
  /** Movies already shown to the user, never returned again. */
  excludeIds?: number[];
  /** Films on the user's list (saved in the app or on their Letterboxd watchlist). */
  watchlistIds?: number[];
};

// ─── Mood ───────────────────────────────────────────────────────────────────

/**
 * Genre fit in [-1, 1]. The best matching genre sets the level, a second match
 * adds a little, and the worst clash subtracts in full — a drama that is also
 * a slasher is not a good "relaxed" pick however dramatic it is.
 */
function moodGenreFit(genreIds: number[], mood: MoodProfile): number {
  const weights = genreIds.map((id) => mood.genreWeights[id] ?? 0);
  const positives = weights.filter((w) => w > 0).sort((a, b) => b - a);
  const worst = Math.min(0, ...weights);
  const value = (positives[0] ?? 0) + 0.25 * (positives[1] ?? 0) + worst;
  return Math.max(-1, Math.min(1, value));
}

function moodScore(c: Candidate, mood: MoodProfile): number {
  const genre = (moodGenreFit(c.movie.genre_ids, mood) + 1) / 2;

  // Many films carry few or no tone keywords on TMDB, so a missing keyword is
  // weak evidence against a film; a matching one is strong evidence for it.
  // Before details load, surfacing through the keyword query is the only hint.
  if (c.keywordHits === undefined) {
    return clamp01(0.7 * genre + (c.fromKeywords ? 0.2 : 0));
  }

  const hits = c.keywordHits.length;
  const keyword = hits === 1 ? 0.6 : hits === 2 ? 0.85 : 1;
  let score = hits === 0 ? 0.7 * genre : 0.5 * genre + 0.5 * keyword;

  if (mood.idealRuntime && c.runtime && c.runtime > mood.idealRuntime.max) {
    score -= Math.min(0.25, (c.runtime - mood.idealRuntime.max) / 120);
  }
  return clamp01(score);
}

// ─── Taste ──────────────────────────────────────────────────────────────────

function genreAffinityOf(profile: TasteProfile): Map<number, number> {
  const entries = Object.entries(profile.genreAffinity ?? {});
  if (entries.length > 0) return new Map(entries.map(([id, v]) => [Number(id), v]));
  // Profiles built before affinities existed only carry topGenres
  const max = Math.max(...profile.topGenres.map((g) => g.score), 1);
  return new Map(profile.topGenres.map((g) => [g.id, g.score / max]));
}

function tasteScore(c: Candidate, affinity: Map<number, number>, maxAffinity: number, profile: TasteProfile): number {
  const genres = c.movie.genre_ids;
  const mean = genres.length > 0
    ? genres.reduce((sum, id) => sum + (affinity.get(id) ?? 0), 0) / genres.length
    : 0;
  const genreTaste = clamp01(0.35 + 0.65 * (mean / maxAffinity));

  // Each loved film that points here is independent evidence; combine as 1 − Π(1 − p).
  const seedSignal = 1 - c.seeds.reduce(
    (miss, seed) => miss * (1 - Math.max(0.35, Math.min(0.65, 0.5 + 0.1 * (seed.rating - 4)))),
    1,
  );

  // Someone who never watches subtitled films is a little less likely to want one tonight.
  const lang = c.movie.original_language;
  const languages = profile.languages ?? [];
  const unfamiliarLanguage = lang !== "en" && languages.length > 0 && !languages.includes(lang);

  return clamp01(0.5 * genreTaste + 0.5 * seedSignal - (unfamiliarLanguage ? 0.06 : 0));
}

// ─── Quality ────────────────────────────────────────────────────────────────

/**
 * Bayesian average: a film's rating is pulled towards the global mean until it
 * has enough votes to be trusted. Stops a 9.2 with 150 votes from outranking
 * an 8.4 with 20,000.
 */
function weightedRating(movie: TMDBMovie): number {
  const PRIOR_VOTES = 300;
  const PRIOR_MEAN = 6.5;
  return (movie.vote_count * movie.vote_average + PRIOR_VOTES * PRIOR_MEAN) / (movie.vote_count + PRIOR_VOTES);
}

const qualityScore = (movie: TMDBMovie) => clamp01((weightedRating(movie) - 5.8) / 2.6);

/**
 * People whose diary is full of little-seen films rarely want the same twenty
 * canonical titles; people who watch the hits do. Penalise films far more
 * popular than what this user usually watches.
 */
function mainstreamPenalty(movie: TMDBMovie, profile: TasteProfile): number {
  if (!profile.typicalVotes) return 0;
  const ordersAbove = Math.log10(Math.max(movie.vote_count, 1)) - Math.log10(Math.max(profile.typicalVotes, 50));
  return Math.max(0, Math.min(0.1, (ordersAbove - 1) * 0.08));
}

// ─── Free text ──────────────────────────────────────────────────────────────

/** How well the film answers what the user typed, in [0, 1]. */
function textScore(c: Candidate, text: TextBoosts): number {
  const genreMatches = c.movie.genre_ids.filter((id) => text.genreIds.includes(id)).length;
  // "terror analógico" names a genre and a style: a found-footage comedy only half fits
  const genreFactor = text.genreIds.length > 0 && genreMatches === 0 ? 0.5 : 1;

  if (c.text.example || c.text.person) return 1;
  if (c.textKeywordHits !== undefined && c.textKeywordHits > 0) {
    return genreFactor * Math.min(1, 0.8 + 0.1 * (c.textKeywordHits - 1));
  }
  // Surfaced by the keyword query but details haven't confirmed it (yet)
  if (c.text.keywordSource && c.textKeywordHits === undefined) return genreFactor * 0.7;
  if (c.text.similarTo) return genreFactor * 0.65;
  return Math.min(0.3, genreMatches * 0.2);
}

/**
 * With a specific request ("terror analógico"), a film either answers it or
 * doesn't belong on the list — however well it fits the mood or the user's
 * taste. Showing fewer films beats padding with unrelated ones.
 */
const RELEVANCE_THRESHOLD = 0.6;

function answersRequest(c: Candidate, text: TextBoosts): boolean {
  if (!text.specific) return true;
  return textScore(c, text) >= RELEVANCE_THRESHOLD;
}

// ─── Retrieval ──────────────────────────────────────────────────────────────

// What a given sentence means doesn't change between requests; remembering it
// makes "Ver otras" instant and spares the rate-limited free models.
const TEXT_CACHE_TTL_MS = 60 * 60 * 1000;
const TEXT_CACHE_MAX = 300;
const textCache = new Map<string, { at: number; boosts: TextBoosts }>();

async function analyzeFreeText(freeText?: string): Promise<TextBoosts> {
  if (!freeText) return NO_TEXT;

  const cacheKey = freeText.trim().toLowerCase().replace(/\s+/g, " ");
  const cached = textCache.get(cacheKey);
  if (cached && Date.now() - cached.at < TEXT_CACHE_TTL_MS) return cached.boosts;

  const rules = analyzeText(freeText);
  if (hasTextModel()) {
    try {
      const ai = await analyzeTextWithAI(freeText);
      // The rule-based themes are few but dependable; keep them alongside the model's
      const boosts = await resolveTextIntent({
        ...ai,
        genreIds: [...new Set([...ai.genreIds, ...rules.genreIds])].filter((id) => !ai.excludeGenreIds.includes(id)),
        keywords: [...new Set([...ai.keywords, ...rules.keywords])],
        examples: ai.examples.length > 0 ? ai.examples : rules.examples,
        excludeKeywords: [...new Set([...ai.excludeKeywords, ...rules.excludeKeywords])],
      });
      if (textCache.size >= TEXT_CACHE_MAX) textCache.delete(textCache.keys().next().value!);
      textCache.set(cacheKey, { at: Date.now(), boosts });
      return boosts;
    } catch (err) {
      console.warn("[recommendationEngine] AI text analysis failed, using the rule-based analyzer:", err instanceof Error ? err.message : err);
    }
  }
  // Not cached: next time the model may be reachable and do better
  return resolveTextIntent(rules);
}

/** Seeds that suit tonight's mood go first; among equals, the better rated. */
function pickSeeds(profile: TasteProfile, mood: MoodProfile, round: number): { seeds: SeedFilm[]; page: number } {
  const ranked = [...(profile.seeds ?? [])].sort(
    (a, b) =>
      moodGenreFit(b.genreIds, mood) + 0.2 * (b.rating - 4) -
      (moodGenreFit(a.genreIds, mood) + 0.2 * (a.rating - 4)),
  );
  // Rounds 0 and 1 read pages 1 and 2 of the best seeds; later rounds move on to the rest.
  const offset = Math.floor(round / 2) * SEEDS_PER_ROUND;
  const window = ranked.slice(offset, offset + SEEDS_PER_ROUND);
  return { seeds: window.length > 0 ? window : ranked.slice(0, SEEDS_PER_ROUND), page: (round % 2) + 1 };
}

/** The mood's strongest genres, preferring the ones this user actually enjoys. */
function pickDiscoverGenres(mood: MoodProfile, affinity: Map<number, number>, explicit: number[]): number[] {
  const fixed = [...new Set(explicit)].slice(0, 2);
  const byFit = Object.entries(mood.genreWeights)
    .map(([id, w]) => ({ id: Number(id), value: w * (1 + Math.max(0, affinity.get(Number(id)) ?? 0)) }))
    .filter((g) => g.value > 0 && !fixed.includes(g.id))
    .sort((a, b) => b.value - a.value)
    .map((g) => g.id);
  return [...fixed, ...byFit].slice(0, 3);
}

/** List data for the user's list, newest first; details are cached, so this is cheap after the first time. */
async function loadWatchlistFilms(ids: number[]): Promise<TMDBMovie[]> {
  const films: TMDBMovie[] = [];
  const wanted = [...new Set(ids)].slice(0, WATCHLIST_MAX);
  for (let i = 0; i < wanted.length; i += 20) {
    const batch = await Promise.all(
      wanted.slice(i, i + 20).map((id) =>
        // With keywords: the finalist pass asks for the same thing, and gets it from cache
        getMovieDetail(id, true)
          .then((d): TMDBMovie => ({ ...d, genre_ids: d.genres.map((g) => g.id) }))
          .catch(() => null),
      ),
    );
    films.push(...batch.filter((m): m is TMDBMovie => m !== null));
  }
  return films;
}

async function retrieveCandidates(
  profile: TasteProfile,
  mood: MoodProfile,
  text: TextBoosts,
  discoverGenres: number[],
  round: number,
  watchlistIds: number[],
): Promise<Map<number, Candidate>> {
  const candidates = new Map<number, Candidate>();
  type Source = { seed?: SeedFilm; keywords?: boolean; watchlist?: boolean; text?: Partial<Candidate["text"]> };
  const add = (movie: TMDBMovie, from: Source) => {
    const existing: Candidate = candidates.get(movie.id) ?? {
      movie, seeds: [], fromKeywords: false, onWatchlist: false,
      text: { example: false, keywordSource: false },
      score: 0, parts: { taste: 0, mood: 0, quality: 0, text: 0 },
    };
    if (from.seed) existing.seeds.push(from.seed);
    if (from.keywords) existing.fromKeywords = true;
    if (from.watchlist) existing.onWatchlist = true;
    if (from.text) existing.text = { ...existing.text, ...from.text };
    candidates.set(movie.id, existing);
  };
  const collect = (request: Promise<{ results: TMDBMovie[] }>, from: (m: TMDBMovie) => Source | null) =>
    request
      .then((res) => res.results.forEach((m) => { const source = from(m); if (source) add(m, source); }))
      .catch(() => {});

  const base: Omit<DiscoverParams, "page"> = {
    sort_by: "vote_count.desc",
    "vote_average.gte": 6,
    "vote_count.gte": 200,
    ...(text.excludeGenreIds.length > 0 ? { without_genres: text.excludeGenreIds.join(",") } : {}),
    // What the user typed ("corta", "de los 90") overrides the defaults
    ...text.overrides,
  };
  // Explicitly requested genres must hold for the keyword query too
  const explicitGenres = text.genreIds.length > 0 ? { with_genres: text.genreIds.slice(0, 2).join("|") } : {};

  const { seeds: tasteSeeds, page: seedPage } = pickSeeds(profile, mood, round);

  // e. The user's own list: films they already want to watch are the best
  //    possible pick when they fit tonight. The two that suit the mood best
  //    also act as weak seeds ("more like this"), since the user chose them.
  const listFilms = await loadWatchlistFilms(watchlistIds);
  listFilms.forEach((m) => add(m, { watchlist: true }));
  const listSeeds: SeedFilm[] = round === 0
    ? [...listFilms]
        .sort((a, b) => moodGenreFit(b.genre_ids, mood) - moodGenreFit(a.genre_ids, mood))
        .slice(0, WATCHLIST_SEEDS)
        .map((m) => ({ tmdbId: m.id, title: m.title, rating: 3.5, genreIds: m.genre_ids, fromWatchlist: true }))
    : [];
  const seeds = [...tasteSeeds, ...listSeeds];

  // d. What the user asked for in words. These queries ignore the mood's genres:
  //    "terror analógico" on a tired night still means analog horror.
  const textBase: Omit<DiscoverParams, "page"> = { ...base, "vote_average.gte": 0, "vote_count.gte": MIN_VOTES_TEXT };
  const references = new Set([...text.similarTo, ...text.examples].map((m) => m.id));
  if (round === 0) text.examples.forEach((m) => add(m, { text: { example: true } }));
  const textQueries: Promise<void>[] = [
    ...(text.keywordIds.length > 0
      ? [
          { ...textBase, ...explicitGenres, with_keywords: text.keywordIds.join("|"), sort_by: "popularity.desc", page: round + 1 },
          { ...textBase, ...explicitGenres, with_keywords: text.keywordIds.join("|"), sort_by: "vote_average.desc", "vote_count.gte": 60, page: round + 1 },
        ].map((params) => collect(discoverMovies(params), () => ({ text: { keywordSource: true } })))
      : []),
    ...text.people.map((person) =>
      collect(
        discoverMovies({ ...textBase, with_people: String(person.id), sort_by: "vote_count.desc", page: round + 1 }),
        () => ({ text: { person: `${person.directs ? "De" : "Con"} ${person.name}` } }),
      ),
    ),
    // Films like the ones named, never the named films themselves
    ...[...text.similarTo, ...text.examples.slice(0, 3)].map((ref) =>
      collect(getMovieRecommendations(ref.id, round + 1), (m) => (references.has(m.id) ? null : { text: { similarTo: ref.title } })),
    ),
  ];
  text.similarTo.forEach((m) => candidates.delete(m.id));

  await Promise.all([
    ...textQueries,
    // a. More like the films you loved
    ...seeds.map((seed) =>
      getMovieRecommendations(seed.tmdbId, seedPage)
        .then((res) => res.results.forEach((m) => add(m, { seed })))
        .catch(() => {}),
    ),
    // b. Films carrying the mood's keywords: the most voted, and the best rated
    ...(mood.keywordIds.length > 0
      ? [
          { ...base, ...explicitGenres, with_keywords: mood.keywordIds.join("|"), page: round + 1 },
          { ...base, ...explicitGenres, with_keywords: mood.keywordIds.join("|"), sort_by: "vote_average.desc", "vote_count.gte": 400, page: round + 1 },
        ].map((params) =>
          discoverMovies(params)
            .then((res) => res.results.forEach((m) => add(m, { keywords: true })))
            .catch(() => {}),
        )
      : []),
    // c. Known films in the mood's genres
    ...[round * 2 + 1, round * 2 + 2].map((page) =>
      discoverMovies({ ...base, "vote_count.gte": 400, with_genres: discoverGenres.join("|"), page })
        .then((res) => res.results.forEach((m) => add(m, {})))
        .catch(() => {}),
    ),
  ]);

  return candidates;
}

/** Constraints that also apply to seed recommendations, which bypass the discover filters. */
function passesHardFilters(c: Candidate, text: TextBoosts, excluded: Set<number>): boolean {
  const { movie } = c;
  if (excluded.has(movie.id)) return false;
  if (text.similarTo.some((m) => m.id === movie.id)) return false;
  if (!movie.release_date) return false;
  if (c.onWatchlist) {
    // The user chose it, so votes don't matter — but it has to be out already
    if (movie.release_date > new Date().toISOString().slice(0, 10)) return false;
  } else {
    const fromText = c.text.example || c.text.keywordSource || !!c.text.person;
    if (movie.vote_count < (fromText ? MIN_VOTES_TEXT : MIN_VOTES)) return false;
    // Matching the request doesn't excuse a film almost nobody liked
    if (fromText && !c.text.example && movie.vote_average < 5.5) return false;
  }
  if (movie.genre_ids.some((id) => text.excludeGenreIds.includes(id))) return false;

  const o = text.overrides;
  if (o["primary_release_date.gte"] && movie.release_date < o["primary_release_date.gte"]) return false;
  if (o["primary_release_date.lte"] && movie.release_date > o["primary_release_date.lte"]) return false;
  if (o["vote_average.gte"] && movie.vote_average < o["vote_average.gte"]) return false;
  if (o.with_original_language && movie.original_language !== o.with_original_language) return false;
  return true;
}

function passesRuntime(runtime: number | null | undefined, text: TextBoosts): boolean {
  if (!runtime) return true; // unknown runtime: don't punish the film for missing data
  const max = text.overrides["with_runtime.lte"];
  const min = text.overrides["with_runtime.gte"];
  return !(max && runtime > max) && !(min && runtime < min);
}

// ─── Selection ──────────────────────────────────────────────────────────────

function genreSimilarity(a: number[], b: number[]): number {
  const setB = new Set(b);
  const shared = a.filter((id) => setB.has(id)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : shared / union;
}

/** Greedy pick: best remaining film, minus a penalty for resembling what's already chosen. */
function diversify(ranked: Candidate[], count: number): Candidate[] {
  const picked: Candidate[] = [];
  const pool = [...ranked];
  while (picked.length < count && pool.length > 0) {
    let bestIndex = 0;
    let bestValue = -Infinity;
    pool.forEach((c, i) => {
      const similarity = Math.max(0, ...picked.map((p) => genreSimilarity(c.movie.genre_ids, p.movie.genre_ids)));
      const sameSeed = picked.filter((p) => p.seeds[0] && p.seeds[0].tmdbId === c.seeds[0]?.tmdbId).length;
      const value = c.score - 0.1 * similarity - 0.03 * sameSeed;
      if (value > bestValue) { bestValue = value; bestIndex = i; }
    });
    picked.push(pool.splice(bestIndex, 1)[0]);
  }
  // Present in plain score order; diversity decided who is in, not who is first
  return picked.sort((a, b) => b.score - a.score);
}

// ─── Explanation ────────────────────────────────────────────────────────────

function buildBlurb(c: Candidate, genreNames: Map<number, string>, affinity: Map<number, number>, request: string): string {
  const parts: string[] = [];

  if (c.text.person) parts.push(c.text.person);
  else if (c.text.example || (c.textKeywordHits ?? 0) > 0) parts.push(request ? `Coincide con «${request}»` : "Coincide con lo que pediste");
  else if (c.text.similarTo) parts.push(`Parecida a ${c.text.similarTo}`);

  if (c.onWatchlist) parts.push("Está en tu lista");

  const seed = [...c.seeds].sort((a, b) => b.rating - a.rating)[0];
  if (seed?.fromWatchlist) {
    parts.push(`Parecida a ${seed.title}, que tienes en tu lista`);
  } else if (seed) {
    parts.push(`Porque te gustó ${seed.title}`);
  } else {
    const favourite = [...c.movie.genre_ids]
      .filter((id) => (affinity.get(id) ?? 0) > 0.15)
      .sort((a, b) => (affinity.get(b) ?? 0) - (affinity.get(a) ?? 0))[0];
    const name = favourite !== undefined ? genreNames.get(favourite) : undefined;
    if (name) parts.push(`Encaja con tu gusto por ${name.toLowerCase()}`);
  }

  const themes = (c.keywordHits ?? []).map((id) => KEYWORD_LABEL[id]).filter(Boolean).slice(0, 2);
  if (themes.length > 0) parts.push(`Con ${themes.join(/^h?i/i.test(themes[1] ?? "") ? " e " : " y ")}`);

  if (weightedRating(c.movie) >= 7.8) parts.push("Muy bien valorada");

  return parts.length > 0 ? `${parts.join(". ")}.` : "Encaja con el tono que buscas esta noche.";
}

function toRecommendedMovie(
  c: Candidate,
  alreadySeen: boolean,
  genreNames: Map<number, string>,
  affinity: Map<number, number>,
  request: string,
): RecommendedMovie {
  const { movie } = c;
  return {
    tmdbId: movie.id,
    title: movie.title,
    year: movie.release_date ? parseInt(movie.release_date.slice(0, 4)) : 0,
    posterPath: movie.poster_path,
    voteAverage: Math.round(movie.vote_average * 10) / 10,
    genres: movie.genre_ids
      .slice(0, 3)
      .map((id) => ({ id, name: genreNames.get(id) ?? "" }))
      .filter((g) => g.name),
    overview: movie.overview,
    blurb: buildBlurb(c, genreNames, affinity, request),
    score: Math.round(c.score * 100),
    tmdbUrl: tmdbMovieUrl(movie.id),
    alreadySeen,
    onWatchlist: c.onWatchlist,
  };
}

// ─── Main ───────────────────────────────────────────────────────────────────

export async function generateRecommendations(
  tasteProfile: TasteProfile,
  moodInput: MoodInput,
  { round = 0, excludeIds = [], watchlistIds = [] }: GenerateOptions = {}
): Promise<RecommendationsResponse> {
  const [genreList, text] = await Promise.all([getGenreList(), analyzeFreeText(moodInput.freeText)]);
  const genreNames = new Map<number, string>(genreList.map((g) => [g.id, g.name]));

  const mood = mergeMoodProfiles(moodInput.categories);
  // A genre the user asks for by name can't also count against the mood
  for (const id of text.genreIds) mood.genreWeights[id] = Math.max(mood.genreWeights[id] ?? 0, 0.8);
  const moodKeywords = new Set(mood.keywordIds);
  const textKeywords = new Set(text.keywordIds);
  const avoidKeywords = new Set(text.excludeKeywordIds);
  // Quoted back in the explanation only when short enough to read as a label
  const typed = (moodInput.freeText ?? "").trim();
  const request = typed.length <= 32 ? typed : "";
  const affinity = genreAffinityOf(tasteProfile);
  const maxAffinity = Math.max(...affinity.values(), 0.1);
  const discoverGenres = pickDiscoverGenres(mood, affinity, text.genreIds);

  const retrieved = await retrieveCandidates(tasteProfile, mood, text, discoverGenres, round, watchlistIds);

  const excluded = new Set(excludeIds);
  const watched = new Set(tasteProfile.watchedTmdbIds);
  const candidates = [...retrieved.values()].filter((c) => passesHardFilters(c, text, excluded));

  const rescore = (c: Candidate) => {
    const taste = tasteScore(c, affinity, maxAffinity, tasteProfile);
    const moodFit = moodScore(c, mood);
    const quality = qualityScore(c.movie);

    const textFit = textScore(c, text);

    let score = WEIGHTS.taste * taste + WEIGHTS.mood * moodFit + WEIGHTS.quality * quality
      - mainstreamPenalty(c.movie, tasteProfile)
      + (c.onWatchlist ? WATCHLIST_BONUS : 0);

    // What the user asked for in words outranks what we inferred. A specific
    // request takes a fixed share of the score; a generic one is a small bonus.
    score = text.specific
      ? TEXT_WEIGHT * textFit + (1 - TEXT_WEIGHT) * score
      : score + 0.4 * textFit;

    // A film that clashes with the mood is not rescued by being great or on-taste —
    // unless it is exactly what was asked for.
    if (textFit < 0.6 && moodGenreFit(c.movie.genre_ids, mood) <= -0.5) score *= 0.6;

    c.parts = { taste, mood: moodFit, quality, text: textFit };
    c.score = clamp01(score);
  };

  // Pass 1: list data only
  candidates.forEach(rescore);
  candidates.sort((a, b) => b.score - a.score);

  // Films that already look like an answer go first; the rest fill the
  // remaining slots, since details may still reveal a matching keyword.
  const byRelevance = (list: Candidate[]) => [
    ...list.filter((c) => answersRequest(c, text)),
    ...list.filter((c) => !answersRequest(c, text)),
  ];
  const unseenPool = byRelevance(candidates.filter((c) => !watched.has(c.movie.id)));
  const finalists = [
    ...unseenPool.slice(0, FINALISTS_UNSEEN),
    // The user's list always gets a full look: its details are already cached
    ...unseenPool.slice(FINALISTS_UNSEEN).filter((c) => c.onWatchlist),
    ...byRelevance(candidates.filter((c) => watched.has(c.movie.id))).slice(0, FINALISTS_SEEN),
  ];

  // Pass 2: keywords and runtime for the finalists
  await Promise.all(
    finalists.map(async (c) => {
      try {
        const detail = await getMovieDetail(c.movie.id, true);
        c.runtime = detail.runtime;
        const keywordIds = (detail.keywords?.keywords ?? []).map((k) => k.id);
        c.keywordHits = keywordIds.filter((id) => moodKeywords.has(id));
        c.textKeywordHits = keywordIds.filter((id) => textKeywords.has(id)).length;
        c.rejected = keywordIds.some((id) => avoidKeywords.has(id));
      } catch {
        // Keep the first-pass score for this one
      }
    }),
  );

  const ranked = finalists.filter((c) => !c.rejected && passesRuntime(c.runtime, text) && answersRequest(c, text));
  ranked.forEach(rescore);
  ranked.sort((a, b) => b.score - a.score);

  const unseen = diversify(ranked.filter((c) => !watched.has(c.movie.id)), RESULTS_UNSEEN);
  const seen = ranked.filter((c) => watched.has(c.movie.id)).slice(0, RESULTS_SEEN);

  return {
    movies: [
      ...unseen.map((c) => toRecommendedMovie(c, false, genreNames, affinity, request)),
      ...seen.map((c) => toRecommendedMovie(c, true, genreNames, affinity, request)),
    ],
    meta: {
      mood: moodInput.categories.map((m) => MOOD_MAP[m].toneLabel).join(" y "),
      genresUsed: discoverGenres.map((id) => genreNames.get(id) ?? "").filter(Boolean),
      totalCandidates: retrieved.size,
      filteredOut: retrieved.size - candidates.length,
    },
  };
}
