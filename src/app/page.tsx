"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import UsernameInput from "@/components/onboarding/UsernameInput";
import MoodSelector from "@/components/onboarding/MoodSelector";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { MOOD_META } from "@/lib/mood/moodMap";
import type { TasteProfile } from "@/types/letterboxd";
import type { MoodCategory } from "@/types/mood";

const LOADING_MESSAGES = [
  "Leyendo tu historial de Letterboxd...",
  "Analizando tus géneros favoritos...",
  "Mapeando tu estado de ánimo...",
  "Buscando películas perfectas para ti...",
  "Casi listo...",
];

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [selectedMoods, setSelectedMoods] = useState<MoodCategory[]>([]);
  const [freeText, setFreeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) return;
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[idx]);
    }, 1800);
    return () => clearInterval(interval);
  }, [loading]);

  async function findMovies() {
    if (!profile || selectedMoods.length === 0) return;

    setLoading(true);
    setError(null);
    setLoadingMsg(LOADING_MESSAGES[0]);

    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasteProfile: profile,
          moodInput: { categories: selectedMoods, freeText: freeText.trim() || undefined },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al generar recomendaciones");
        return;
      }

      // Store in sessionStorage and navigate to results
      sessionStorage.setItem(
        "movieasufeel_results",
        JSON.stringify({ profile, moodCategories: selectedMoods, result: data })
      );
      router.push("/results");
    } catch {
      setError("Error de red. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-gray-950/95 backdrop-blur-sm">
          <div className="text-5xl animate-pulse">🎬</div>
          <LoadingSpinner size={36} />
          <p className="text-sm text-gray-400 transition-all duration-500">{loadingMsg}</p>
        </div>
      )}

      <main className="mx-auto min-h-dvh max-w-xl px-4 py-12 sm:py-20">
        {/* Header */}
        <header className="mb-10 text-center">
          <h1
            className="text-4xl font-bold text-gray-50 sm:text-5xl"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            MovieAsUFeel
          </h1>
          <p className="mt-3 text-base text-gray-500">
            Películas elegidas para cómo te sientes ahora mismo
          </p>
        </header>

        {/* Step 1 — Letterboxd */}
        <section className="mb-6 rounded-xl border border-gray-800 bg-gray-900/40 p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              1
            </span>
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              Tu perfil de Letterboxd
            </h2>
          </div>
          <UsernameInput profile={profile} onProfileLoaded={setProfile} />
        </section>

        {/* Step 2 — Mood (shows after profile loaded) */}
        <section
          className={[
            "mb-6 rounded-xl border bg-gray-900/40 p-5 transition-all duration-300",
            profile ? "border-gray-800 opacity-100" : "border-gray-800/40 opacity-40 pointer-events-none",
          ].join(" ")}
        >
          <div className="mb-4 flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${
                profile ? "bg-indigo-600" : "bg-gray-700"
              }`}
            >
              2
            </span>
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              ¿Cómo te sientes?
            </h2>
          </div>
          <MoodSelector
            selected={selectedMoods}
            freeText={freeText}
            onChange={setSelectedMoods}
            onFreeTextChange={setFreeText}
          />
        </section>

        {error && <ErrorMessage message={error} />}

        {/* CTA */}
        <button
          type="button"
          onClick={findMovies}
          disabled={!profile || selectedMoods.length === 0 || loading}
          className="w-full rounded-xl bg-indigo-600 py-3.5 text-base font-semibold text-white transition-all hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {selectedMoods.length > 0 ? (
            <>
              {selectedMoods.map((m) => MOOD_META[m].emoji).join(" ")} Encuentra mis películas
            </>
          ) : (
            "Encuentra mis películas"
          )}
        </button>

        <p className="mt-6 text-center text-xs text-gray-600">
          Tu perfil debe ser público en Letterboxd · Datos de{" "}
          <a
            href="https://www.themoviedb.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-gray-700 hover:text-gray-400"
          >
            TMDB
          </a>
        </p>
      </main>
    </>
  );
}
