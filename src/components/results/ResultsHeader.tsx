"use client";

import { motion } from "framer-motion";
import { MOOD_META } from "@/lib/mood/moodMap";
import type { MoodCategory } from "@/types/mood";
import type { TasteProfile } from "@/types/letterboxd";
import type { RecommendationsResponse } from "@/types/recommendation";

type Props = {
  profile: TasteProfile;
  moodCategories: MoodCategory[];
  result: RecommendationsResponse;
  newCount: number;
  seenCount: number;
};

const MOOD_CHIP_COLORS: Record<MoodCategory, { bg: string; border: string; text: string }> = {
  happy:      { bg: "rgba(255,214,10,0.1)",   border: "rgba(255,214,10,0.3)",   text: "#FFD60A" },
  sad:        { bg: "rgba(0,212,255,0.1)",    border: "rgba(0,212,255,0.3)",    text: "#00D4FF" },
  anxious:    { bg: "rgba(255,0,110,0.1)",    border: "rgba(255,0,110,0.3)",    text: "#FF006E" },
  relaxed:    { bg: "rgba(131,56,236,0.1)",   border: "rgba(131,56,236,0.3)",   text: "#A06BEC" },
  frustrated: { bg: "rgba(255,80,0,0.1)",     border: "rgba(255,80,0,0.3)",     text: "#FF7040" },
  thoughtful: { bg: "rgba(0,180,216,0.1)",    border: "rgba(0,180,216,0.3)",    text: "#00B4D8" },
  excited:    { bg: "rgba(255,77,155,0.1)",   border: "rgba(255,77,155,0.3)",   text: "#FF4D9B" },
  tired:      { bg: "rgba(148,163,184,0.1)",  border: "rgba(148,163,184,0.25)", text: "#94A3B8" },
};

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

export default function ResultsHeader({ profile, moodCategories, result, newCount, seenCount }: Props) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}>
      {/* Animated gradient accent line — expands from left */}
      <motion.div
        initial={{ scaleX: 0, originX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ height: 2, background: "linear-gradient(to right, #00d4ff, #8338ec, #ff006e)" }}
      />

      <div className="px-6 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

          {/* Left: mood chips + title + meta */}
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {moodCategories.map((mood, i) => {
                const c = MOOD_CHIP_COLORS[mood];
                return (
                  <motion.span
                    key={mood}
                    initial={{ opacity: 0, scale: 0.85, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.32, ease: EASE }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
                  >
                    <span>{MOOD_META[mood].emoji}</span>
                    <span>{MOOD_META[mood].label}</span>
                  </motion.span>
                );
              })}
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              className="font-display"
              style={{ fontWeight: 400, fontSize: "clamp(34px, 4vw, 56px)", color: "white", lineHeight: 0.92, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 4 }}
            >
              {newCount} película{newCount !== 1 ? "s" : ""} para ti
              {seenCount > 0 && (
                <span style={{ fontSize: "clamp(20px, 2.2vw, 30px)", color: "rgba(255,255,255,0.28)", fontWeight: 400, marginLeft: "0.5rem" }}>
                  + {seenCount} vistas
                </span>
              )}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.32, duration: 0.35 }}
              className="text-sm"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Basado en{" "}
              <span style={{ color: "rgba(255,255,255,0.7)" }}>{profile.filmCount.toLocaleString()} películas</span>
              {" "}vistas por{" "}
              <span style={{ color: "#00d4ff" }}>@{profile.username}</span>
            </motion.p>
          </div>

          {/* Right: genres used */}
          {result.meta.genresUsed.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              className="flex-shrink-0"
            >
              <p className="text-xs font-medium mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                GÉNEROS EXPLORADOS
              </p>
              <div className="flex flex-wrap gap-1.5" style={{ maxWidth: 260 }}>
                {result.meta.genresUsed.map(g => (
                  <span key={g} className="text-xs font-medium px-2.5 py-1 rounded-lg" style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.18)", color: "rgba(0,212,255,0.8)" }}>
                    {g}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
