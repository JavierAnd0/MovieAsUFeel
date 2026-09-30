"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import SaveButton from "./SaveButton";
import { MatchLabel, toSaved } from "./MovieCard";
import { posterUrl } from "@/lib/tmdb/client";
import type { RecommendedMovie } from "@/types/recommendation";

/** The single best match, shown large: tonight's screening. */
export default function FeaturedMovie({ movie, onSelect }: { movie: RecommendedMovie; onSelect: (id: number) => void }) {
  const imageUrl = posterUrl(movie.posterPath, "w500");

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl border border-linea bg-sala-2"
      aria-labelledby="featured-title"
    >
      {/* Poster blown up and blurred as the room's light */}
      {imageUrl && (
        <div aria-hidden="true" className="absolute inset-0 opacity-40">
          <Image src={imageUrl} alt="" fill sizes="100vw" className="scale-125 object-cover blur-3xl saturate-150" />
        </div>
      )}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-sala-2 via-sala-2/85 to-sala-2/40" />

      <div className="relative grid gap-6 p-5 sm:grid-cols-[minmax(0,220px)_1fr] sm:gap-10 sm:p-8 lg:grid-cols-[minmax(0,260px)_1fr]">
        <button
          onClick={() => onSelect(movie.tmdbId)}
          className="relative mx-auto aspect-[2/3] w-44 overflow-hidden rounded-xl border border-linea-fuerte shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)] sm:mx-0 sm:w-full"
          aria-label={`Ver detalles de ${movie.title}`}
        >
          {imageUrl ? (
            <Image src={imageUrl} alt="" fill sizes="260px" className="object-cover" priority />
          ) : (
            <div className="grid h-full place-items-center bg-sala-3 text-humo/40"><Icon name="film" size={48} /></div>
          )}
        </button>

        <div className="flex flex-col justify-center">
          <p className="text-sm font-medium text-laton">Tu mejor coincidencia</p>
          <h2 id="featured-title" className="font-display mt-2 text-pantalla" style={{ fontSize: "clamp(40px, 5.5vw, 76px)" }}>
            {movie.title}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-humo">
            {movie.year > 0 && <span>{movie.year}</span>}
            <span className="inline-flex items-center gap-1">
              <Icon name="star" size={13} className="text-laton" /> {movie.voteAverage.toFixed(1)} en TMDB
            </span>
            {movie.genres.length > 0 && <span>{movie.genres.map(g => g.name).join(", ")}</span>}
            <MatchLabel score={movie.score} className="text-sm" />
          </div>

          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-pantalla/85">
            {movie.overview ? truncate(movie.overview, 280) : movie.blurb}
          </p>
          {movie.overview && <p className="mt-3 max-w-xl text-sm italic text-humo">{movie.blurb}</p>}

          <div className="mt-6 flex flex-wrap gap-2">
            <button onClick={() => onSelect(movie.tmdbId)} className="btn btn-primary">
              <Icon name="play" size={14} /> Ver detalles y tráiler
            </button>
            <SaveButton movie={toSaved(movie)} variant="full" />
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return text.slice(0, text.lastIndexOf(" ", max)) + "…";
}
