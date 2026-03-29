"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MovieGrid from "@/components/results/MovieGrid";
import ResultsHeader from "@/components/results/ResultsHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";
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
    if (!raw) {
      router.replace("/");
      return;
    }
    try {
      setData(JSON.parse(raw) as StoredData);
    } catch {
      setError("No se pudieron cargar los resultados. Vuelve al inicio.");
    }
  }, [router]);

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <ErrorMessage message={error} />
        <Link href="/" className="mt-4 block text-center text-sm text-indigo-400 hover:underline">
          Volver al inicio
        </Link>
      </main>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  const { profile, moodCategories, result } = data;

  if (result.movies.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-4xl mb-4">😕</p>
        <h2 className="text-xl font-semibold text-gray-200 mb-2">
          Sin resultados por ahora
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          No encontramos suficientes películas para esta combinación. Prueba con un estado de ánimo diferente.
        </p>
        <Link
          href="/"
          className="inline-flex rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Empezar de nuevo
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      {/* Nav */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          <span>←</span>
          <span
            className="font-semibold text-gray-400"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            MovieAsUFeel
          </span>
        </Link>
        <Link
          href="/"
          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Empezar de nuevo
        </Link>
      </div>

      {/* Results header */}
      <div className="mb-6">
        <ResultsHeader
          profile={profile}
          moodCategories={moodCategories}
          result={result}
        />
      </div>

      {/* Movie grid */}
      <MovieGrid movies={result.movies} />

      {/* Footer */}
      <p className="mt-10 text-center text-xs text-gray-700">
        Datos de películas proporcionados por{" "}
        <a
          href="https://www.themoviedb.org"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-500"
        >
          The Movie Database (TMDB)
        </a>
      </p>
    </main>
  );
}
