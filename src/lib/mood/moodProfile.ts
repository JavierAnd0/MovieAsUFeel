import type { MoodCategory } from "@/types/mood";

/**
 * What a mood asks of a film.
 *
 * - genreWeights: how much each TMDB genre helps (+) or hurts (−) this mood, in [-1, 1].
 *   The negatives matter as much as the positives: they keep a horror film out of
 *   a "tired" night even when the user loves horror.
 * - keywordIds: TMDB keywords that describe the tone or theme (grief, heist,
 *   comforting…). Genres are too coarse to tell a tearjerker from a courtroom
 *   drama; keywords are what actually carry the mood.
 * - idealRuntime: soft preference in minutes, when the mood implies one.
 *
 * TMDB genre ids: 28 Action | 12 Adventure | 16 Animation | 35 Comedy | 80 Crime
 * 99 Documentary | 18 Drama | 10751 Family | 14 Fantasy | 36 History | 27 Horror
 * 10402 Music | 9648 Mystery | 10749 Romance | 878 Sci-Fi | 53 Thriller
 * 10752 War | 37 Western
 */
export type MoodProfile = {
  genreWeights: Record<number, number>;
  keywordIds: number[];
  idealRuntime?: { max: number };
};

export const MOOD_PROFILE: Record<MoodCategory, MoodProfile> = {
  happy: {
    genreWeights: { 35: 1, 10402: 0.5, 12: 0.5, 10751: 0.5, 16: 0.4, 10749: 0.4, 27: -1, 10752: -0.8, 53: -0.4, 80: -0.3 },
    // friendship, buddy comedy, hopeful, joyful, amused, playful, absurd
    keywordIds: [6054, 167541, 325824, 325832, 325765, 259376, 309974],
  },
  sad: {
    genreWeights: { 18: 1, 10749: 0.6, 10402: 0.2, 28: -0.7, 27: -0.6, 12: -0.4, 35: -0.4, 10751: -0.3 },
    // grief, melancholy, loss of loved one, tragedy, loneliness, sentimental, tearjerker, bittersweet
    keywordIds: [9872, 4232, 697, 10614, 9957, 319319, 156924, 278730],
  },
  anxious: {
    genreWeights: { 53: 1, 9648: 0.7, 27: 0.5, 80: 0.5, 10751: -0.8, 35: -0.5, 10749: -0.4, 16: -0.4 },
    // psychological thriller, paranoia, tense, suspenseful, intense, survival
    keywordIds: [12565, 2340, 316832, 314730, 321464, 10349],
  },
  relaxed: {
    genreWeights: { 35: 0.8, 10749: 0.6, 10402: 0.5, 99: 0.4, 10751: 0.3, 16: 0.3, 12: 0.2, 27: -1, 10752: -0.8, 53: -0.7, 80: -0.4, 28: -0.3 },
    // slice of life, road trip, small town, comforting, whimsical, nostalgic, relaxed
    keywordIds: [9914, 7312, 1415, 325784, 324713, 164246, 267876],
  },
  frustrated: {
    genreWeights: { 28: 1, 80: 0.7, 53: 0.6, 37: 0.4, 10752: 0.3, 10749: -0.6, 10751: -0.6, 99: -0.3 },
    // revenge, vigilante, underdog, one man army, heist, angry
    keywordIds: [9748, 7002, 240, 13116, 10051, 200918],
  },
  thoughtful: {
    genreWeights: { 18: 0.8, 878: 0.8, 9648: 0.7, 99: 0.5, 36: 0.5, 10751: -0.5, 28: -0.4, 35: -0.3, 27: -0.3 },
    // philosophical, existentialism, moral dilemma, dystopia, meditative, identity, introspective
    keywordIds: [212737, 181324, 198423, 4565, 197056, 1284, 269808],
  },
  excited: {
    genreWeights: { 28: 1, 12: 1, 878: 0.6, 14: 0.6, 99: -0.6, 18: -0.3, 10749: -0.3 },
    // space opera, superhero, chase, rescue mission, excited, exhilarated, heist
    keywordIds: [161176, 9715, 3713, 11107, 325811, 325812, 10051],
  },
  tired: {
    genreWeights: { 35: 1, 16: 0.7, 10751: 0.6, 10749: 0.4, 12: 0.3, 27: -1, 10752: -0.9, 53: -0.6, 80: -0.5, 18: -0.3 },
    // comforting, whimsical, playful, nostalgic, hopeful, friendship, buddy comedy
    keywordIds: [325784, 324713, 259376, 164246, 325824, 6054, 167541],
    idealRuntime: { max: 125 },
  },
};

/** Several moods at once: average the genre weights, pool the keywords. */
export function mergeMoodProfiles(moods: MoodCategory[]): MoodProfile {
  const profiles = moods.map((m) => MOOD_PROFILE[m]);
  const genreWeights: Record<number, number> = {};
  for (const p of profiles) {
    for (const [id, w] of Object.entries(p.genreWeights)) {
      genreWeights[Number(id)] = (genreWeights[Number(id)] ?? 0) + w / profiles.length;
    }
  }
  const runtimes = profiles.flatMap((p) => (p.idealRuntime ? [p.idealRuntime.max] : []));
  return {
    genreWeights,
    keywordIds: [...new Set(profiles.flatMap((p) => p.keywordIds))],
    ...(runtimes.length > 0 ? { idealRuntime: { max: Math.max(...runtimes) } } : {}),
  };
}

/** Spanish labels for the keywords above, used to explain a recommendation. */
export const KEYWORD_LABEL: Record<number, string> = {
  6054: "amistad", 167541: "comedia de colegas", 325824: "esperanza", 325832: "alegría",
  325765: "humor", 259376: "tono juguetón", 309974: "humor absurdo",
  9872: "duelo", 4232: "melancolía", 697: "pérdida", 10614: "tragedia", 9957: "soledad",
  319319: "tono sentimental", 156924: "lágrima fácil", 278730: "final agridulce",
  12565: "thriller psicológico", 2340: "paranoia", 316832: "tensión", 314730: "suspense",
  321464: "intensidad", 10349: "supervivencia",
  9914: "vida cotidiana", 7312: "viaje por carretera", 1415: "pueblo pequeño",
  325784: "tono reconfortante", 324713: "fantasía amable", 164246: "nostalgia", 267876: "ritmo tranquilo",
  9748: "venganza", 7002: "justiciero", 240: "historia de superación", 13116: "uno contra todos",
  10051: "golpe perfecto", 200918: "rabia",
  212737: "filosofía", 181324: "existencialismo", 198423: "dilema moral", 4565: "distopía",
  197056: "ritmo contemplativo", 1284: "identidad", 269808: "introspección",
  161176: "ópera espacial", 9715: "superhéroes", 3713: "persecuciones", 11107: "misión de rescate",
  325811: "emoción", 325812: "adrenalina",
};
