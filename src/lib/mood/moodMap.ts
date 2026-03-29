import type { MoodCategory, MoodSignal } from "@/types/mood";

// TMDB Genre IDs reference:
// 28 Action | 12 Adventure | 16 Animation | 35 Comedy | 80 Crime
// 99 Documentary | 18 Drama | 10751 Family | 14 Fantasy | 36 History
// 27 Horror | 10402 Music | 9648 Mystery | 10749 Romance | 878 Sci-Fi
// 53 Thriller | 10770 TV Movie | 10752 War | 37 Western

export const MOOD_MAP: Record<MoodCategory, MoodSignal> = {
  happy: {
    genres: [35, 10751, 12],
    keywords: ["feel-good", "uplifting", "heartwarming"],
    sortBy: "popularity.desc",
    voteThreshold: 6.5,
    toneLabel: "feel-good",
  },
  sad: {
    genres: [18, 10749],
    keywords: ["emotional", "moving", "tearjerker"],
    sortBy: "vote_average.desc",
    voteThreshold: 7.0,
    toneLabel: "moving",
  },
  anxious: {
    genres: [53, 27],
    keywords: ["suspense", "tension", "psychological"],
    sortBy: "vote_average.desc",
    voteThreshold: 6.5,
    toneLabel: "tense",
  },
  relaxed: {
    genres: [35, 99, 10749],
    keywords: ["light-hearted", "cozy", "slice-of-life"],
    sortBy: "popularity.desc",
    voteThreshold: 6.0,
    toneLabel: "easy-watch",
  },
  frustrated: {
    genres: [28, 80],
    keywords: ["cathartic", "revenge", "adrenaline"],
    sortBy: "popularity.desc",
    voteThreshold: 6.5,
    toneLabel: "cathartic",
  },
  thoughtful: {
    genres: [18, 9648, 878],
    keywords: ["thought-provoking", "philosophical", "cerebral"],
    sortBy: "vote_average.desc",
    voteThreshold: 7.0,
    toneLabel: "cerebral",
  },
  excited: {
    genres: [28, 12, 14],
    keywords: ["epic", "high-energy", "spectacular"],
    sortBy: "popularity.desc",
    voteThreshold: 6.5,
    toneLabel: "high-energy",
  },
  tired: {
    genres: [35, 16, 10751],
    keywords: ["comforting", "light", "easy"],
    sortBy: "vote_average.desc",
    voteThreshold: 6.5,
    toneLabel: "comforting",
  },
};

export const MOOD_META: Record<
  MoodCategory,
  { emoji: string; label: string; description: string }
> = {
  happy: { emoji: "😄", label: "Feliz", description: "Alegre y con ganas de reír" },
  sad: { emoji: "😢", label: "Melancólico", description: "Necesito sentir algo profundo" },
  anxious: { emoji: "😰", label: "Ansioso", description: "Con energía nerviosa que canalizar" },
  relaxed: { emoji: "😌", label: "Relajado", description: "Tranquilo, sin esfuerzo mental" },
  frustrated: { emoji: "😤", label: "Frustrado", description: "Necesito algo catártico" },
  thoughtful: { emoji: "🤔", label: "Reflexivo", description: "Con ganas de pensar y analizar" },
  excited: { emoji: "🤩", label: "Emocionado", description: "Con mucha energía y entusiasmo" },
  tired: { emoji: "😴", label: "Cansado", description: "Solo quiero algo fácil de ver" },
};
