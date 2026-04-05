"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MovieGrid from "@/components/results/MovieGrid";
import ResultsHeader from "@/components/results/ResultsHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { MOOD_META } from "@/lib/mood/moodMap";
import type { TasteProfile } from "@/types/letterboxd";
import type { MoodCategory } from "@/types/mood";
import type { RecommendedMovie, RecommendationsResponse } from "@/types/recommendation";

type StoredData = {
  profile: TasteProfile;
  moodCategories: MoodCategory[];
  result: RecommendationsResponse;
};

const MOOD_GLOW: Record<MoodCategory, string> = {
  happy:      "rgba(255,214,10,0.12)",
  sad:        "rgba(0,212,255,0.12)",
  anxious:    "rgba(255,0,110,0.12)",
  relaxed:    "rgba(131,56,236,0.12)",
  frustrated: "rgba(255,80,0,0.12)",
  thoughtful: "rgba(0,180,216,0.12)",
  excited:    "rgba(255,77,155,0.12)",
  tired:      "rgba(148,163,184,0.08)",
};

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #00d4ff, #8338ec)" }}>
        <div style={{ position: "absolute", left: 9, top: 11, width: 14, height: 10, backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 1 }} />
        <div style={{ position: "absolute", left: 9, top: 11, width: 5,  height: 10, backgroundColor: "rgba(0,212,255,0.6)" }} />
        <div style={{ position: "absolute", left: 18, top: 11, width: 5, height: 10, backgroundColor: "rgba(0,212,255,0.6)" }} />
      </div>
      <span style={{ fontWeight: 700, fontSize: 18, color: "white" }}>CineMood</span>
    </div>
  );
}

function SectionDivider({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-4 my-10">
      <div className="flex-1" style={{ height: 1, background: "rgba(255,255,255,0.07)" }} />
      <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold" style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "rgba(255,255,255,0.45)",
      }}>
        <span>✓</span>
        <span className="hidden sm:inline">También encajan · ya las viste ({count})</span>
        <span className="sm:hidden">Ya vistas ({count})</span>
      </div>
      <div className="flex-1" style={{ height: 1, background: "rgba(255,255,255,0.07)" }} />
    </div>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const [data,    setData]    = useState<StoredData | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("movieasufeel_results");
    if (!raw) { router.replace("/"); return; }
    try {
      setData(JSON.parse(raw) as StoredData);
      setTimeout(() => setVisible(true), 50);
    } catch {
      setError("No se pudieron cargar los resultados.");
    }
  }, [router]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (!data && !error) {
    return (
      <div className="min-h-dvh bg-[#0a0a0f] flex items-center justify-center">
        <div style={{ color: "rgba(0,212,255,0.7)" }}>
          <LoadingSpinner size={36} />
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="min-h-dvh bg-[#0a0a0f] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-4xl mb-4">⚠️</p>
          <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>{error}</p>
          <Link href="/" className="inline-flex items-center justify-center h-11 px-6 rounded-xl font-bold text-sm text-[#0a0a0f]" style={{ background: "linear-gradient(to right, #00d4ff, #8338ec)" }}>
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const { profile, moodCategories, result } = data;

  const newMovies:  RecommendedMovie[] = result.movies.filter(m => !m.alreadySeen);
  const seenMovies: RecommendedMovie[] = result.movies.filter(m =>  m.alreadySeen);

  // ── Empty ─────────────────────────────────────────────────────────────────
  if (newMovies.length === 0 && seenMovies.length === 0) {
    return (
      <div className="min-h-dvh bg-[#0a0a0f] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-5xl mb-5">😕</p>
          <h2 className="text-xl font-bold text-white mb-2">Sin resultados por ahora</h2>
          <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>
            No encontramos películas para esta combinación. Prueba con un estado de ánimo diferente.
          </p>
          <Link href="/" className="inline-flex items-center justify-center h-11 px-6 rounded-xl font-bold text-sm text-[#0a0a0f]" style={{ background: "linear-gradient(to right, #00d4ff, #8338ec)" }}>
            Empezar de nuevo
          </Link>
        </div>
      </div>
    );
  }

  const glow1 = moodCategories[0] ? MOOD_GLOW[moodCategories[0]] : "rgba(131,56,236,0.1)";
  const glow2 = moodCategories[1] ? MOOD_GLOW[moodCategories[1]] : null;

  return (
    <div
      className="min-h-dvh bg-[#0a0a0f]"
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(10px)", transition: "opacity 0.35s ease, transform 0.35s ease" }}
    >
      {/* Background mood glows — responsive size */}
      <div className="fixed pointer-events-none" style={{ top: -150, left: -150, width: "clamp(300px, 50vw, 600px)", height: "clamp(300px, 50vw, 600px)", background: `radial-gradient(ellipse at center, ${glow1} 0%, transparent 65%)`, filter: "blur(60px)", zIndex: 0 }} />
      {glow2 && (
        <div className="fixed pointer-events-none" style={{ bottom: -100, right: -100, width: "clamp(250px, 40vw, 500px)", height: "clamp(250px, 40vw, 500px)", background: `radial-gradient(ellipse at center, ${glow2} 0%, transparent 65%)`, filter: "blur(60px)", zIndex: 0 }} />
      )}

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:py-12">

        {/* Navbar */}
        <nav className="mb-8 flex items-center justify-between h-14 px-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <Link href="/"><Logo /></Link>

          <div className="hidden sm:flex items-center gap-2">
            {moodCategories.map(m => (
              <span key={m} className="text-lg" title={MOOD_META[m].label}>{MOOD_META[m].emoji}</span>
            ))}
            <span className="text-sm ml-1" style={{ color: "rgba(255,255,255,0.35)" }}>
              · {newMovies.length} recomendaciones
              {seenMovies.length > 0 && ` · ${seenMovies.length} ya vistas`}
            </span>
          </div>

          <Link
            href="/"
            className="text-sm font-medium rounded-xl px-4 py-2 transition-all"
            style={{ color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.04)"; }}
          >
            ← Empezar de nuevo
          </Link>
        </nav>

        {/* Results header */}
        <div className="mb-8">
          <ResultsHeader profile={profile} moodCategories={moodCategories} result={result} newCount={newMovies.length} seenCount={seenMovies.length} />
        </div>

        {/* ── New movies section ── */}
        {newMovies.length > 0 && <MovieGrid movies={newMovies} />}

        {/* ── Already-seen section ── */}
        {seenMovies.length > 0 && (
          <>
            <SectionDivider count={seenMovies.length} />
            <MovieGrid movies={seenMovies} />
          </>
        )}

        {/* Footer */}
        <p className="mt-14 text-center text-xs" style={{ color: "rgba(255,255,255,0.18)" }}>
          Datos de películas por{" "}
          <a
            href="https://www.themoviedb.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline transition-colors"
            style={{ textDecorationColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.18)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.45)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.18)"; }}
          >
            The Movie Database (TMDB)
          </a>
        </p>
      </div>
    </div>
  );
}
