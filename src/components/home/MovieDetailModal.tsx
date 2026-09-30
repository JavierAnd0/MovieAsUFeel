"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import SaveButton from "@/components/results/SaveButton";

type MovieDetail = {
  id: number;
  title: string;
  tagline: string;
  overview: string;
  year: string;
  runtime: string;
  runtimeRaw: number;
  voteAverage: number | null;
  voteCount: string;
  posterPath: string | null;
  backdropPath: string | null;
  genres: Array<{ id: number; name: string }>;
  director: string | null;
  cast: string[];
  certification: string | null;
  trailerKey: string | null;
};

type Props = {
  movieId: number | null;
  onClose: () => void;
};

function ModalInner({ movieId, onClose }: { movieId: number; onClose: () => void }) {
  const [data, setData] = useState<MovieDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [attempt, setAttempt] = useState(0);
  const [showTrailer, setShowTrailer] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    setShowTrailer(false);
    fetch(`/api/movie/${movieId}`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d: MovieDetail) => { setData(d); setStatus("ready"); })
      .catch(() => { if (!controller.signal.aborted) setStatus("error"); });
    return () => controller.abort();
  }, [movieId, attempt]);

  // Lock page scroll, focus the dialog, restore focus on close.
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      // Keep Tab inside the dialog
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), iframe");
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const backdrop = data?.backdropPath
    ? `https://image.tmdb.org/t/p/w1280${data.backdropPath}`
    : data?.posterPath ? `https://image.tmdb.org/t/p/w780${data.posterPath}` : null;
  const poster = data?.posterPath ? `https://image.tmdb.org/t/p/w500${data.posterPath}` : null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="movie-detail-title"
      className="fixed inset-0 z-[9000] overflow-y-auto bg-sala"
    >
      {backdrop && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 h-[80vh]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={backdrop} alt="" className="size-full object-cover opacity-35 saturate-[0.7]" />
          <div className="absolute inset-0 bg-gradient-to-t from-sala via-sala/70 to-sala/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-sala/80 to-transparent" />
        </div>
      )}

      <div className="sticky top-0 z-30 flex justify-between p-4 sm:p-6">
        <button ref={closeRef} onClick={onClose} className="btn btn-ghost btn-sm bg-sala/60 backdrop-blur-md">
          <Icon name="back" size={16} /> Volver
        </button>
      </div>

      {status === "loading" && (
        <div className="grid h-[70vh] place-items-center text-laton"><LoadingSpinner size={36} /></div>
      )}

      {status === "error" && (
        <div className="grid h-[70vh] place-items-center px-6 text-center">
          <div>
            <p className="text-pantalla">No se pudo cargar la ficha de esta película.</p>
            <button onClick={() => setAttempt(a => a + 1)} className="btn btn-ghost mt-4">Reintentar</button>
          </div>
        </div>
      )}

      {status === "ready" && data && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 mx-auto grid max-w-6xl gap-8 px-5 pb-20 pt-[12vh] sm:px-8 md:grid-cols-[1fr_minmax(0,260px)] md:gap-14"
        >
          {poster && (
            <div className="mx-auto w-40 md:order-2 md:mx-0 md:w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={poster} alt={`Póster de ${data.title}`} className="w-full rounded-xl border border-linea-fuerte shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]" />
            </div>
          )}

          <div className="md:order-1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-humo">
              {data.year && <span>{data.year}</span>}
              {data.runtime && <span>{data.runtime}</span>}
              {data.certification && <span className="rounded border border-linea-fuerte px-1.5 text-xs">{data.certification}</span>}
              {data.voteAverage && (
                <span className="inline-flex items-center gap-1">
                  <Icon name="star" size={13} className="text-laton" />
                  <span className="text-pantalla">{data.voteAverage}</span> ({data.voteCount} votos)
                </span>
              )}
            </div>

            <h1 id="movie-detail-title" className="font-display mt-3 text-pantalla" style={{ fontSize: "clamp(48px, 8vw, 112px)", textShadow: "0 8px 48px rgba(0,0,0,0.8)" }}>
              {data.title}
            </h1>
            {data.tagline && <p className="mt-3 text-lg italic text-pantalla/70">{data.tagline}</p>}

            {data.genres.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {data.genres.slice(0, 5).map(g => <span key={g.id} className="chip">{g.name}</span>)}
              </div>
            )}

            {data.overview && (
              <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-pantalla/85">{data.overview}</p>
            )}

            {(data.director || data.cast.length > 0) && (
              <dl className="mt-6 grid max-w-2xl grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                {data.director && (<><dt className="text-humo">Dirección</dt><dd className="text-pantalla">{data.director}</dd></>)}
                {data.cast.length > 0 && (<><dt className="text-humo">Reparto</dt><dd className="text-pantalla">{data.cast.join(", ")}</dd></>)}
              </dl>
            )}

            <div className="mt-8 flex flex-wrap gap-2">
              {data.trailerKey && (
                <button onClick={() => setShowTrailer(s => !s)} className="btn btn-primary" aria-expanded={showTrailer}>
                  <Icon name={showTrailer ? "close" : "play"} size={14} />
                  {showTrailer ? "Cerrar tráiler" : "Ver tráiler"}
                </button>
              )}
              <SaveButton
                variant="full"
                movie={{
                  tmdbId: data.id,
                  title: data.title,
                  year: Number(data.year) || 0,
                  posterPath: data.posterPath,
                  voteAverage: data.voteAverage,
                }}
              />
              <a href={`https://letterboxd.com/tmdb/${data.id}/`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                Abrir en Letterboxd <Icon name="external" size={14} />
              </a>
            </div>

            {showTrailer && data.trailerKey && (
              <div className="mt-6 aspect-video w-full max-w-3xl overflow-hidden rounded-xl border border-linea bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${data.trailerKey}?autoplay=1&rel=0`}
                  title={`Tráiler de ${data.title}`}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="size-full"
                />
              </div>
            )}

            <p className="mt-10 text-xs text-humo/70">
              Ficha de{" "}
              <a href={`https://www.themoviedb.org/movie/${data.id}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-humo">
                TMDB
              </a>
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function MovieDetailModal({ movieId, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {movieId !== null && (
        <motion.div
          key={`modal-${movieId}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[9000]"
        >
          <ModalInner movieId={movieId} onClose={onClose} />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
