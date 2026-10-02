"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import NavBar from "@/components/ui/NavBar";
import Icon from "@/components/ui/Icon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import MovieDetailModal from "@/components/home/MovieDetailModal";
import { syncLetterboxdWatchlist, useWatchlist, type SavedMovie } from "@/lib/client/watchlist";
import { DRAFT_STORAGE_KEY, readSession } from "@/lib/client/session";
import { posterUrl } from "@/lib/tmdb/client";
import type { TasteProfile } from "@/types/letterboxd";

function PosterGrid({
  movies,
  onSelect,
  onRemove,
}: {
  movies: SavedMovie[];
  onSelect: (id: number) => void;
  onRemove?: (id: number) => void;
}) {
  return (
    <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {movies.map(movie => {
        const src = posterUrl(movie.posterPath, "w342");
        return (
          <li key={movie.tmdbId} className="group relative">
            <button onClick={() => onSelect(movie.tmdbId)} className="block w-full rounded-xl text-left" aria-label={`${movie.title}. Ver detalles`}>
              <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-linea bg-sala-2 transition-transform duration-300 group-hover:-translate-y-1">
                {src ? (
                  <Image src={src} alt="" fill sizes="(max-width: 640px) 50vw, 16vw" className="object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-humo/40"><Icon name="film" size={32} /></div>
                )}
              </div>
              <h3 className="mt-3 line-clamp-2 text-[15px] font-semibold leading-snug text-pantalla">{movie.title}</h3>
              <p className="mt-1 text-xs text-humo">{movie.year > 0 ? movie.year : ""}</p>
            </button>
            {onRemove && (
              <button
                onClick={() => onRemove(movie.tmdbId)}
                aria-label={`Quitar ${movie.title} de Mi lista`}
                title="Quitar de Mi lista"
                className="absolute right-2.5 top-2.5 grid size-9 place-items-center rounded-full border border-linea-fuerte bg-sala/75 text-pantalla backdrop-blur-md transition-colors hover:border-butaca-claro/60 hover:bg-butaca/80"
              >
                <Icon name="close" size={15} />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function WatchlistPage() {
  const { items, saved, letterboxd, remove } = useWatchlist();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  // localStorage is only readable after mount; avoid flashing the empty state.
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const draft = readSession<{ profile?: TasteProfile }>(DRAFT_STORAGE_KEY);
    setUsername(draft?.profile?.username ?? null);
  }, []);

  const letterboxdUser = letterboxd?.username ?? username;

  // Keep the Letterboxd layer fresh (no-op when it was fetched recently)
  useEffect(() => {
    if (letterboxdUser) syncLetterboxdWatchlist(letterboxdUser);
  }, [letterboxdUser]);

  async function refresh() {
    if (!letterboxdUser) return;
    setSyncing(true);
    await syncLetterboxdWatchlist(letterboxdUser, { force: true });
    setSyncing(false);
  }

  const fromLetterboxd = items.filter(m => m.source === "letterboxd");

  return (
    <div className="relative min-h-dvh">
      <div className="light-spill" style={{ top: -220, right: -180, width: 620, height: 620, background: "rgba(158,59,52,0.14)" }} />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6">
        <NavBar right={<Link href="/" className="btn btn-primary btn-sm">Buscar películas</Link>} />

        <header className="mt-10 sm:mt-14">
          <h1 className="font-display text-pantalla" style={{ fontSize: "clamp(52px, 7vw, 96px)" }}>Mi lista</h1>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-humo">
            Lo que guardas aquí y tu watchlist de Letterboxd. Cuando una de estas películas encaja con lo que buscas, aparece en tus recomendaciones.
          </p>
        </header>

        {mounted && items.length === 0 && !letterboxdUser && (
          <div className="mt-12 rounded-2xl border border-dashed border-linea-fuerte px-6 py-16 text-center">
            <Icon name="bookmark" size={28} className="mx-auto text-humo" />
            <p className="mt-4 text-pantalla">Todavía no has guardado ninguna película.</p>
            <p className="mt-1 text-sm text-humo">Pulsa el marcador de cualquier póster, o conecta tu Letterboxd para traer tu watchlist.</p>
            <Link href="/" className="btn btn-primary mt-6">Encontrar películas</Link>
          </div>
        )}

        {mounted && saved.length > 0 && (
          <section className="mt-12" aria-labelledby="saved-title">
            <h2 id="saved-title" className="font-display text-4xl text-pantalla">Guardadas aquí</h2>
            <p className="mt-1 text-sm text-humo">
              {saved.length} {saved.length === 1 ? "película" : "películas"}, solo en este navegador
            </p>
            <PosterGrid movies={saved} onSelect={setSelectedId} onRemove={remove} />
          </section>
        )}

        {mounted && letterboxdUser && (
          <section className="mt-14" aria-labelledby="lb-title">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="lb-title" className="font-display text-4xl text-pantalla">Tu watchlist de Letterboxd</h2>
                <p className="mt-1 text-sm text-humo">
                  {letterboxd
                    ? <>{letterboxd.films.length} películas de @{letterboxd.username}. Se gestiona desde Letterboxd.</>
                    : <>Leyendo la watchlist de @{letterboxdUser}…</>}
                  {letterboxd && fromLetterboxd.length < letterboxd.films.length && (
                    <> {letterboxd.films.length - fromLetterboxd.length} también están en tus guardadas.</>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={refresh} disabled={syncing} className="btn btn-ghost btn-sm">
                  {syncing ? <LoadingSpinner size={14} /> : <Icon name="refresh" size={14} />}
                  {syncing ? "Actualizando" : "Actualizar"}
                </button>
                <a href={`https://letterboxd.com/${letterboxdUser}/watchlist/`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                  Abrir en Letterboxd <Icon name="external" size={13} />
                </a>
              </div>
            </div>
            {letterboxd && fromLetterboxd.length === 0 && letterboxd.films.length === 0 && (
              <p className="mt-6 text-sm text-humo">Tu watchlist de Letterboxd está vacía o no es pública.</p>
            )}
            <PosterGrid movies={fromLetterboxd} onSelect={setSelectedId} />
          </section>
        )}
      </div>

      <MovieDetailModal movieId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
