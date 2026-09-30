"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import NavBar, { WatchlistLink } from "@/components/ui/NavBar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import MovieDetailModal from "@/components/home/MovieDetailModal";
import ResultsHeader from "@/components/results/ResultsHeader";
import ResultsToolbar, { type SortKey } from "@/components/results/ResultsToolbar";
import FeaturedMovie from "@/components/results/FeaturedMovie";
import MovieGrid from "@/components/results/MovieGrid";
import {
  DRAFT_STORAGE_KEY, RESULTS_STORAGE_KEY, fetchProfile, fetchRecommendations,
  parseResultsQuery, readSession, sameQuery, writeSession,
  type StoredResults,
} from "@/lib/client/session";
import { gel } from "@/lib/mood/moodColors";
import type { TasteProfile } from "@/types/letterboxd";
import type { RecommendedMovie } from "@/types/recommendation";

const LOADING_MESSAGES = [
  "Leyendo tu diario de Letterboxd",
  "Cruzando tus géneros con tu estado de ánimo",
  "Descartando lo que ya has visto",
  "Eligiendo la función de esta noche",
];

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: StoredResults };

function ResultsView() {
  const router = useRouter();
  const params = useSearchParams();
  const query = useMemo(() => parseResultsQuery(new URLSearchParams(params.toString())), [params]);

  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [moreLoading, setMoreLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("match");
  const [showSeen, setShowSeen] = useState(false);

  // Load: session cache → draft profile → fetch profile. Works for shared links too.
  useEffect(() => {
    if (!query) { router.replace("/"); return; }
    let cancelled = false;

    (async () => {
      const cached = readSession<StoredResults>(RESULTS_STORAGE_KEY);
      if (cached?.result && sameQuery(cached, query)) {
        setState({ status: "ready", data: cached });
        return;
      }
      setState({ status: "loading" });
      try {
        const draft = readSession<{ profile?: TasteProfile }>(DRAFT_STORAGE_KEY);
        const profile = draft?.profile && draft.profile.username.toLowerCase() === query.username.toLowerCase()
          ? draft.profile
          : await fetchProfile(query.username);
        const result = await fetchRecommendations(profile, query.moods, query.freeText);
        if (cancelled) return;
        const data: StoredResults = { ...query, username: profile.username, profile, result, round: 0 };
        writeSession(RESULTS_STORAGE_KEY, data);
        setState({ status: "ready", data });
      } catch (err) {
        if (!cancelled) setState({ status: "error", message: err instanceof Error ? err.message : "Algo salió mal." });
      }
    })();

    return () => { cancelled = true; };
  }, [query, router, attempt]);

  // Keep the onboarding draft in sync so "Cambiar estado de ánimo" lands on the mood step.
  useEffect(() => {
    if (state.status !== "ready") return;
    const { profile, moods, freeText } = state.data;
    writeSession(DRAFT_STORAGE_KEY, { step: "mood", username: profile.username, profile, selectedMoods: moods, freeText });
  }, [state]);

  const loadMore = useCallback(async () => {
    if (state.status !== "ready") return;
    const { data } = state;
    setMoreLoading(true);
    setNotice(null);
    try {
      const round = data.round + 1;
      const result = await fetchRecommendations(data.profile, data.moods, data.freeText, {
        round,
        excludeIds: data.result.movies.map(m => m.tmdbId),
      });
      if (!result.movies.some(m => !m.alreadySeen)) {
        setNotice("No quedan más películas nuevas para esta combinación. Prueba con otro estado de ánimo.");
        return;
      }
      const next: StoredResults = { ...data, result, round };
      writeSession(RESULTS_STORAGE_KEY, next);
      setState({ status: "ready", data: next });
      setActiveGenre(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "No se pudieron cargar más películas.");
    } finally {
      setMoreLoading(false);
    }
  }, [state]);

  if (state.status === "loading") return <LoadingScreen />;

  if (state.status === "error") {
    return (
      <CenteredMessage title="No pudimos preparar tu cartelera" body={state.message}>
        <button onClick={() => setAttempt(a => a + 1)} className="btn btn-primary">Reintentar</button>
        <Link href="/" className="btn btn-ghost">Volver al inicio</Link>
      </CenteredMessage>
    );
  }

  const { profile, moods, freeText, result } = state.data;
  const unseen = result.movies.filter(m => !m.alreadySeen);
  const seen = result.movies.filter(m => m.alreadySeen);

  if (unseen.length === 0 && seen.length === 0) {
    return (
      <CenteredMessage
        title="Nada encaja con esta combinación"
        body="Prueba con otros estados de ánimo o quita parte del texto que escribiste."
      >
        <Link href="/" className="btn btn-primary">Cambiar estado de ánimo</Link>
      </CenteredMessage>
    );
  }

  const [featured, ...rest] = unseen;
  // With no unseen picks left, the already-seen ones are all there is to show.
  const includeSeen = showSeen || !featured;
  const pool = includeSeen ? [...rest, ...seen] : rest;
  const genres = [...new Set(pool.flatMap(m => m.genres.map(g => g.name)))].sort((a, b) => a.localeCompare(b, "es"));
  const visible = sortMovies(
    activeGenre ? pool.filter(m => m.genres.some(g => g.name === activeGenre)) : pool,
    sort,
  );

  return (
    <div className="relative min-h-dvh">
      {moods.slice(0, 2).map((m, i) => (
        <div
          key={m}
          className="light-spill"
          style={i === 0
            ? { top: -200, left: -200, width: "clamp(320px, 50vw, 680px)", height: "clamp(320px, 50vw, 680px)", background: gel(m, 0.12) }
            : { bottom: -160, right: -160, width: "clamp(280px, 40vw, 560px)", height: "clamp(280px, 40vw, 560px)", background: gel(m, 0.1) }}
        />
      ))}

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6">
        <NavBar right={<WatchlistLink />} />

        <div className="mt-10 sm:mt-14">
          <ResultsHeader
            profile={profile}
            moods={moods}
            freeText={freeText}
            newCount={unseen.length}
            onMore={loadMore}
            moreLoading={moreLoading}
          />
          {notice && <p role="status" className="alert mt-6">{notice}</p>}
        </div>

        {featured && (
          <div className="mt-10">
            <FeaturedMovie key={featured.tmdbId} movie={featured} onSelect={setSelectedId} />
          </div>
        )}

        {(rest.length > 0 || seen.length > 0) && (
          <section className="mt-14" aria-labelledby="more-title">
            <h2 id="more-title" className="font-display mb-5 text-4xl text-pantalla">
              {featured ? "También para esta noche" : "Ya las viste, pero encajan"}
            </h2>
            <ResultsToolbar
              genres={genres}
              activeGenre={activeGenre}
              onGenreChange={setActiveGenre}
              sort={sort}
              onSortChange={setSort}
              seenCount={featured ? seen.length : 0}
              showSeen={includeSeen}
              onShowSeenChange={setShowSeen}
            />
            <div className="mt-8">
              {visible.length > 0 ? (
                <MovieGrid movies={visible} onSelect={setSelectedId} />
              ) : (
                <p className="py-10 text-center text-sm text-humo">
                  Ninguna película de {activeGenre?.toLowerCase()} en esta tanda.{" "}
                  <button onClick={() => setActiveGenre(null)} className="text-laton underline underline-offset-4">Ver todos los géneros</button>
                </p>
              )}
            </div>
          </section>
        )}

        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-humo">¿Ninguna te convence?</p>
          <button onClick={loadMore} disabled={moreLoading} className="btn btn-ghost">
            {moreLoading && <LoadingSpinner size={15} />}
            {moreLoading ? "Buscando" : "Ver otras películas"}
          </button>
        </div>

        <footer className="mt-16 text-center text-xs text-humo/60">
          Datos de películas de{" "}
          <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-humo">
            The Movie Database (TMDB)
          </a>
        </footer>
      </div>

      <MovieDetailModal movieId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function sortMovies(movies: RecommendedMovie[], sort: SortKey): RecommendedMovie[] {
  const sorted = [...movies];
  if (sort === "rating") sorted.sort((a, b) => b.voteAverage - a.voteAverage);
  else if (sort === "year") sorted.sort((a, b) => b.year - a.year);
  else sorted.sort((a, b) => Number(a.alreadySeen) - Number(b.alreadySeen) || b.score - a.score);
  return sorted;
}

function LoadingScreen() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex(i => (i + 1) % LOADING_MESSAGES.length), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center" role="status" aria-live="polite">
      <span className="text-laton"><LoadingSpinner size={32} /></span>
      <p key={index} className="font-display text-[clamp(32px,5vw,56px)] text-pantalla animate-[fadeIn_0.5s_ease]">
        {LOADING_MESSAGES[index]}
      </p>
    </div>
  );
}

function CenteredMessage({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-5">
      <div className="max-w-md text-center">
        <h1 className="font-display text-5xl text-pantalla">{title}</h1>
        <p className="mb-8 mt-4 text-[15px] leading-relaxed text-humo">{body}</p>
        <div className="flex flex-wrap justify-center gap-2">{children}</div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ResultsView />
    </Suspense>
  );
}

