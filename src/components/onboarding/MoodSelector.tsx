"use client";

import EmojiButton from "@/components/ui/EmojiButton";
import { MOOD_META } from "@/lib/mood/moodMap";
import type { MoodCategory } from "@/types/mood";

const MOOD_ORDER: MoodCategory[] = [
  "happy", "sad", "anxious", "relaxed",
  "frustrated", "thoughtful", "excited", "tired",
];

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
      // Deselect oldest and add new
      onChange([...selected.slice(1), mood]);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-3 text-sm text-gray-400">
          Selecciona hasta 3 estados de ánimo
        </p>
        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-4">
          {MOOD_ORDER.map((mood) => {
            const meta = MOOD_META[mood];
            const isSelected = selected.includes(mood);
            const isDisabled = !isSelected && selected.length >= MAX_SELECTED;
            return (
              <EmojiButton
                key={mood}
                emoji={meta.emoji}
                label={meta.label}
                description={meta.description}
                selected={isSelected}
                disabled={isDisabled}
                onClick={() => toggle(mood)}
              />
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="freetext" className="mb-1.5 block text-sm text-gray-400">
          ¿Algo más específico? <span className="text-gray-600">(opcional)</span>
        </label>
        <textarea
          id="freetext"
          rows={2}
          value={freeText}
          onChange={(e) => onFreeTextChange(e.target.value)}
          placeholder='Ej: "algo gracioso pero no infantil, reciente o clásica, no muy larga"'
          className="w-full resize-none rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
}
