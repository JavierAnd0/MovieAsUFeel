"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { MOOD_META, joinSpanish } from "@/lib/mood/moodMap";
import { gel } from "@/lib/mood/moodColors";
import type { MoodCategory } from "@/types/mood";
import type { TasteProfile } from "@/types/letterboxd";

type Props = {
  profile: TasteProfile;
  moods: MoodCategory[];
  freeText: string;
  newCount: number;
  onMore: () => void;
  moreLoading: boolean;
};

export default function ResultsHeader({ profile, moods, freeText, newCount, onMore, moreLoading }: Props) {
  const [shared, setShared] = useState<"idle" | "copied" | "failed">("idle");

  async function share() {
    const url = window.location.href;
    const title = `Una noche de ${joinSpanish(moods.map(m => MOOD_META[m].night))}`;
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title, text: `${title}: películas elegidas por MovieAsUFeel`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShared("copied");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setShared("failed");
    }
    setTimeout(() => setShared("idle"), 2400);
  }

  return (
    <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <ul className="mb-4 flex flex-wrap gap-2" aria-label="Estados de ánimo elegidos">
          {moods.map(m => (
            <li key={m} className="chip" style={{ borderColor: gel(m, 0.45), color: gel(m, 1), background: gel(m, 0.08) }}>
              <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: gel(m, 1), boxShadow: `0 0 8px ${gel(m, 0.8)}` }} />
              {MOOD_META[m].label}
            </li>
          ))}
        </ul>
        <h1 className="font-display text-pantalla" style={{ fontSize: "clamp(44px, 6.5vw, 92px)" }}>
          Una noche de {joinSpanish(moods.map(m => MOOD_META[m].night))}
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-humo">
          {newCount} {newCount === 1 ? "película que no has visto" : "películas que no has visto"}, elegidas a partir de las {profile.filmCount} de tu diario de Letterboxd (@{profile.username}).
          {freeText && <> Teniendo en cuenta: <span className="text-pantalla/80">«{freeText}»</span>.</>}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        <button onClick={share} className="btn btn-ghost btn-sm" aria-live="polite">
          <Icon name={shared === "copied" ? "check" : "share"} size={15} />
          {shared === "copied" ? "Enlace copiado" : shared === "failed" ? "No se pudo copiar" : "Compartir"}
        </button>
        <button onClick={onMore} disabled={moreLoading} className="btn btn-ghost btn-sm">
          {moreLoading ? <LoadingSpinner size={15} /> : <Icon name="refresh" size={15} />}
          {moreLoading ? "Buscando" : "Ver otras"}
        </button>
        <Link href="/" className="btn btn-ghost btn-sm">Cambiar estado de ánimo</Link>
      </div>
    </header>
  );
}
