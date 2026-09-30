import type { MoodCategory } from "@/types/mood";

/**
 * Each mood is a lighting gel: one hue, used as-is for accents and
 * at low alpha for glows/fills. Tuned to sit on the warm dark background.
 */
export const MOOD_GEL: Record<MoodCategory, string> = {
  happy:      "#F2C14E",
  sad:        "#6E9BDB",
  anxious:    "#D9587A",
  relaxed:    "#7DB894",
  frustrated: "#E2703F",
  thoughtful: "#8C86E0",
  excited:    "#EA6AA6",
  tired:      "#A8A3B8",
};

export const MOOD_ORDER: MoodCategory[] = [
  "happy", "sad", "anxious", "relaxed",
  "frustrated", "thoughtful", "excited", "tired",
];

/** Hex (#RRGGBB) → rgba() string with the given alpha. */
export function gel(mood: MoodCategory, alpha: number): string {
  const hex = MOOD_GEL[mood];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
