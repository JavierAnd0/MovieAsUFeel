"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import NavBar from "@/components/ui/NavBar";
import Icon from "@/components/ui/Icon";
import MovieDetailModal from "@/components/home/MovieDetailModal";
import { useWatchlist } from "@/lib/client/watchlist";
import { posterUrl } from "@/lib/tmdb/client";

export default function WatchlistPage() {
  const { items, remove } = useWatchlist();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // localStorage is only readable after mount; avoid flashing the empty state.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="relative min-h-dvh">
      <div className="light-spill" style={{ top: -220, right: -180, width: 620, height: 620, background: "rgba(158,59,52,0.14)" }} />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6">
        <NavBar right={<Link href="/" className="btn btn-primary btn-sm">Buscar películas</Link>} />

        <header className="mt-10 sm:mt-14">
          <h1 className="font-display text-pantalla" style={{ fontSize: "clamp(52px, 7vw, 96px)" }}>Mi lista</h1>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-humo">
            Las películas que guardas se quedan en este navegador para cuando tengas un rato.
          </p>
        </header>

        {mounted && items.length === 0 && (
          <div className="mt-12 rounded-2xl border border-dashed border-linea-fuerte px-6 py-16 text-center">
            <Icon name="bookmark" size={28} className="mx-auto text-humo" />
            <p className="mt-4 text-pantalla">Todavía no has guardado ninguna película.</p>
            <p className="mt-1 text-sm text-humo">Pulsa el marcador de cualquier póster para añadirla aquí.</p>
            <Link href="/" className="btn btn-primary mt-6">Encontrar películas</Link>
          </div>
        )}

        {mounted && items.length > 0 && (
          <>
            <p className="mt-10 text-sm text-humo">
              {items.length} {items.length === 1 ? "película guardada" : "películas guardadas"}
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {items.map(movie => {
                const src = posterUrl(movie.posterPath, "w342");
                return (
                  <li key={movie.tmdbId} className="group relative">
                    <button onClick={() => setSelectedId(movie.tmdbId)} className="block w-full rounded-xl text-left" aria-label={`${movie.title}. Ver detalles`}>
                      <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-linea bg-sala-2 transition-transform duration-300 group-hover:-translate-y-1">
                        {src ? (
                          <Image src={src} alt="" fill sizes="(max-width: 640px) 50vw, 16vw" className="object-cover" />
                        ) : (
                          <div className="grid h-full place-items-center text-humo/40"><Icon name="film" size={32} /></div>
                        )}
                      </div>
                      <h2 className="mt-3 line-clamp-2 text-[15px] font-semibold leading-snug text-pantalla">{movie.title}</h2>
                      <p className="mt-1 text-xs text-humo">{movie.year > 0 ? movie.year : ""}</p>
                    </button>
                    <button
                      onClick={() => remove(movie.tmdbId)}
                      aria-label={`Quitar ${movie.title} de Mi lista`}
                      title="Quitar de Mi lista"
                      className="absolute right-2.5 top-2.5 grid size-9 place-items-center rounded-full border border-linea-fuerte bg-sala/75 text-pantalla backdrop-blur-md transition-colors hover:border-butaca-claro/60 hover:bg-butaca/80"
                    >
                      <Icon name="close" size={15} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <MovieDetailModal movieId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
