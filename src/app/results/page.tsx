"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import MovieCard from "@/components/results/MovieCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { MOOD_META } from "@/lib/mood/moodMap";
import type { TasteProfile } from "@/types/letterboxd";
import type { MoodCategory } from "@/types/mood";
import type { RecommendationsResponse } from "@/types/recommendation";

type StoredData = {
  profile: TasteProfile;
  moodCategories: MoodCategory[];
  result: RecommendationsResponse;
};

export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<StoredData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("movieasufeel_results");
    if (!raw) { router.replace("/"); return; }
    try { setData(JSON.parse(raw) as StoredData); }
    catch { setError("Could not load results. Please start over."); }
  }, [router]);

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <ErrorMessage message={error} />
        <Link href="/" className="text-sm" style={{ color: "var(--accent)" }}>← Back to home</Link>
      </main>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  const { profile, moodCategories, result } = data;
  const moodEmojis = moodCategories.map(c => MOOD_META[c].emoji).join(" ");

  return (
    <>
      <Navbar />

      <main className="min-h-screen pt-24 pb-20 px-6">
        <div className="mx-auto max-w-5xl">

          {/* Section header — matches "TODAY'S PROJECTIONS" style */}
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="label-tag mb-2">Your Projection</p>
              <h2 className="font-display text-4xl">
                Today&apos;s Picks {moodEmojis}
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--text-2)" }}>
                Based on @{profile.username} · {profile.filmCount} films watched
                {result.meta.filteredOut > 0 && ` · ${result.meta.filteredOut} already seen filtered`}
              </p>
            </div>
            <Link
              href="/"
              className="text-xs font-semibold tracking-widest uppercase transition-colors hover:text-white"
              style={{ color: "var(--text-3)" }}
            >
              ← New Session
            </Link>
          </div>

          {/* Genre tags used */}
          {result.meta.genresUsed.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-2">
              {result.meta.genresUsed.map(g => (
                <span
                  key={g}
                  className="px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase"
                  style={{ background: "rgba(255,107,0,0.1)", border: "1px solid rgba(255,107,0,0.3)", color: "var(--accent)" }}
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* No results */}
          {result.movies.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-5xl mb-4">🎞️</p>
              <h3 className="font-display text-2xl mb-2">No Projections Found</h3>
              <p className="text-sm mb-8" style={{ color: "var(--text-2)" }}>
                Try a different mood combination or make sure you have rated films on Letterboxd.
              </p>
              <Link
                href="/"
                className="rounded-full px-8 py-3 text-sm font-bold tracking-widest uppercase"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                Try Again
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {result.movies.map(movie => (
                <MovieCard key={movie.tmdbId} movie={movie} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 text-center" style={{ borderColor: "var(--border)" }}>
        <p className="font-display text-base tracking-widest mb-3" style={{ color: "var(--text-2)" }}>CineMood</p>
        <div className="flex justify-center gap-6 mb-3">
          {["Letterboxd", "Instagram", "Twitter", "Privacy", "Terms"].map(l => (
            <a key={l} href="#" className="text-xs tracking-widest uppercase hover:text-white transition-colors" style={{ color: "var(--text-3)" }}>{l}</a>
          ))}
        </div>
        <p className="text-xs" style={{ color: "var(--text-3)" }}>© 2025 CINEMOOD. THE DIGITAL PROJECTIONIST.</p>
      </footer>
    </>
  );
}
