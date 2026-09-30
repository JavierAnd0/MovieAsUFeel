"use client";

import NavBar from "@/components/ui/NavBar";
import StepIndicator from "./StepIndicator";
import { MOOD_META } from "@/lib/mood/moodMap";
import { MOOD_ORDER, gel } from "@/lib/mood/moodColors";
import type { MoodCategory } from "@/types/mood";

type Props = {
  username: string;
  selected: MoodCategory[];
  onToggle: (mood: MoodCategory) => void;
  freeText: string;
  onFreeTextChange: (value: string) => void;
  onBack: () => void;
  onSubmit: () => void;
};

const MAX_MOODS = 3;

export default function MoodStep({ username, selected, onToggle, freeText, onFreeTextChange, onBack, onSubmit }: Props) {
  // The room is lit by whatever gels are selected — one spill per mood.
  const spills = selected.length > 0 ? selected : null;

  return (
    <div className="relative flex min-h-dvh flex-col px-4 pt-4 sm:px-6 sm:pt-6">
      {spills ? spills.map((m, i) => (
        <div
          key={m}
          className="light-spill"
          style={{ left: `${8 + i * 32}%`, top: `${10 + i * 18}%`, width: 520, height: 420, background: gel(m, 0.16) }}
        />
      )) : (
        <div className="light-spill" style={{ left: "30%", top: "10%", width: 640, height: 440, background: "rgba(207,164,94,0.07)" }} />
      )}

      <NavBar onBack={onBack} backLabel={`@${username}`} right={<StepIndicator current={2} total={2} />} />

      <form
        className="relative z-10 mx-auto w-full max-w-4xl flex-1 py-12"
        onSubmit={e => { e.preventDefault(); if (selected.length > 0) onSubmit(); }}
      >
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="font-display text-pantalla" style={{ fontSize: "clamp(52px, 7vw, 96px)" }}>
            ¿Cómo te<br className="sm:hidden" /> sientes hoy?
          </h1>
          <p className="text-sm text-humo sm:pb-2" aria-live="polite">
            {selected.length === 0
              ? `Elige hasta ${MAX_MOODS}`
              : `${selected.length} de ${MAX_MOODS} elegidos`}
          </p>
        </div>

        <fieldset>
          <legend className="sr-only">Estados de ánimo</legend>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            {MOOD_ORDER.map(mood => {
              const meta = MOOD_META[mood];
              const isOn = selected.includes(mood);
              return (
                <button
                  key={mood}
                  type="button"
                  onClick={() => onToggle(mood)}
                  aria-pressed={isOn}
                  className="group relative flex min-h-[124px] flex-col items-start justify-end overflow-hidden rounded-2xl border p-4 text-left transition-[border-color,background-color,transform] duration-300 hover:-translate-y-0.5"
                  style={{
                    borderColor: isOn ? gel(mood, 0.6) : "var(--color-linea)",
                    background: isOn
                      ? `radial-gradient(120% 90% at 20% 0%, ${gel(mood, 0.32)} 0%, ${gel(mood, 0.08)} 55%, rgba(26,22,18,0.6) 100%)`
                      : "rgba(26,22,18,0.55)",
                  }}
                >
                  {/* The gel itself: a small lamp that lights up when chosen */}
                  <span
                    aria-hidden="true"
                    className="absolute right-4 top-4 size-3 rounded-full transition-shadow duration-300"
                    style={{
                      background: isOn ? gel(mood, 1) : gel(mood, 0.45),
                      boxShadow: isOn ? `0 0 18px 4px ${gel(mood, 0.55)}` : "none",
                    }}
                  />
                  <span className="font-display text-[28px] transition-colors" style={{ color: isOn ? gel(mood, 1) : "var(--color-pantalla)" }}>
                    {meta.label}
                  </span>
                  <span className="mt-1 text-xs leading-snug text-humo">{meta.description}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-8">
          <label htmlFor="mood-text" className="mb-2 block text-sm font-medium text-pantalla">
            ¿Algo más concreto? <span className="font-normal text-humo">Opcional</span>
          </label>
          <textarea
            id="mood-text"
            rows={2}
            maxLength={500}
            value={freeText}
            onChange={e => onFreeTextChange(e.target.value)}
            placeholder="Algo gracioso pero no infantil, que no dure más de dos horas…"
            className="field resize-none px-4 py-3"
          />
        </div>

        <button type="submit" disabled={selected.length === 0} className="btn btn-primary mt-6 h-14 w-full text-[15px]">
          {selected.length === 0 ? "Elige al menos un estado de ánimo" : "Ver mis películas"}
        </button>
      </form>
    </div>
  );
}
