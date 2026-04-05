"use client";

import { motion } from "framer-motion";
import EmojiButton from "@/components/ui/EmojiButton";
import { MOOD_META } from "@/lib/mood/moodMap";
import type { MoodCategory } from "@/types/mood";

const MOOD_ORDER: MoodCategory[] = [
  "happy", "sad", "anxious", "relaxed",
  "frustrated", "thoughtful", "excited", "tired",
];

const MOOD_ACCENT: Record<MoodCategory, string> = {
  happy:      "#FFD60A",
  sad:        "#00D4FF",
  anxious:    "#FF006E",
  relaxed:    "#A06BEC",
  frustrated: "#FF5500",
  thoughtful: "#00B4D8",
  excited:    "#FF4D9B",
  tired:      "#94A3B8",
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const itemVariants = {
  hidden:  { opacity: 0, y: 14, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: EASE } },
};

type Props = {
  selected: MoodCategory[];
  freeText: string;
  onChange: (categories: MoodCategory[]) => void;
  onFreeTextChange: (text: string) => void;
};

export default function MoodSelector({
  selected,
  freeText,
  onChange,
  onFreeTextChange,
}: Props) {
  const MAX_SELECTED = 3;

  function toggle(mood: MoodCategory) {
    if (selected.includes(mood)) {
      onChange(selected.filter((m) => m !== mood));
    } else if (selected.length < MAX_SELECTED) {
      onChange([...selected, mood]);
    } else {
      onChange([...selected.slice(1), mood]);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-3 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
          Selecciona hasta 3 estados de ánimo
        </p>
        <motion.div
          className="grid grid-cols-4 gap-2.5"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {MOOD_ORDER.map((mood) => {
            const meta       = MOOD_META[mood];
            const isSelected = selected.includes(mood);
            const isDisabled = !isSelected && selected.length >= MAX_SELECTED;
            return (
              <motion.div key={mood} variants={itemVariants}>
                <EmojiButton
                  emoji={meta.emoji}
                  label={meta.label}
                  description={meta.description}
                  selected={isSelected}
                  disabled={isDisabled}
                  accent={MOOD_ACCENT[mood]}
                  onClick={() => toggle(mood)}
                />
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      <div>
        <label htmlFor="freetext" className="mb-1.5 block text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
          ¿Algo más específico? <span style={{ color: "rgba(255,255,255,0.2)" }}>(opcional)</span>
        </label>
        <textarea
          id="freetext"
          rows={2}
          value={freeText}
          onChange={(e) => onFreeTextChange(e.target.value)}
          placeholder='Ej: "algo gracioso pero no infantil, reciente o clásica, no muy larga"'
          className="w-full resize-none rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none transition-all"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
          onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(0,212,255,0.4)"; }}
          onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)"; }}
        />
      </div>
    </div>
  );
}
