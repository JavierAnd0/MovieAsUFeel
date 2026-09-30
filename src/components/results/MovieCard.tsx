"use client";

import Image from "next/image";
import Icon from "@/components/ui/Icon";
import SaveButton from "./SaveButton";
import { posterUrl } from "@/lib/tmdb/client";
import type { RecommendedMovie } from "@/types/recommendation";

type Props = {
  movie: RecommendedMovie;
  onSelect: (id: number) => void;
};

export function toSaved(movie: RecommendedMovie) {
  return {
    tmdbId: movie.tmdbId,
    title: movie.title,
    year: movie.year,
    posterPath: movie.posterPath,
    voteAverage: movie.voteAverage,
  };
}

export function MatchLabel({ score, className = "" }: { score: number; className?: string }) {
  return (
    <span className={`text-xs font-semibold tabular-nums ${score >= 70 ? "text-laton" : "text-humo"} ${className}`}>
      {score}% afín
    </span>
  );
}

export default function MovieCard({ movie, onSelect }: Props) {
  const imageUrl = posterUrl(movie.posterPath, "w342");

  return (
    <article className={`group relative ${movie.alreadySeen ? "opacity-70 hover:opacity-100" : ""} transition-opacity`}>
      <button
        onClick={() => onSelect(movie.tmdbId)}
        className="block w-full rounded-xl text-left"
        aria-label={`${movie.title}, ${movie.year}. Ver detalles`}
      >
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-linea bg-sala-2 transition-[border-color,transform,box-shadow] duration-300 ease-[var(--ease-cine)] group-hover:-translate-y-1 group-hover:border-linea-fuerte group-hover:shadow-[0_18px_40px_-12px_rgba(0,0,0,0.8)]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className={`object-cover ${movie.alreadySeen ? "brightness-75 saturate-50" : ""}`}
            />
          ) : (
            <div className="grid h-full place-items-center text-humo/40">
              <Icon name="film" size={36} />
            </div>
          )}
          {movie.alreadySeen && (
            <span className="chip absolute bottom-2.5 left-2.5 border-linea-fuerte bg-sala/80 text-pantalla backdrop-blur-md">
              <Icon name="check" size={13} /> Ya la viste
            </span>
          )}
        </div>

        <div className="px-0.5 pt-3">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-pantalla">{movie.title}</h3>
          <div className="mt-1 flex items-center gap-3 text-xs text-humo">
            {movie.year > 0 && <span>{movie.year}</span>}
            <span className="inline-flex items-center gap-1">
              <Icon name="star" size={11} className="text-laton" />
              {movie.voteAverage.toFixed(1)}
            </span>
            <MatchLabel score={movie.score} className="ml-auto" />
          </div>
          {movie.genres.length > 0 && (
            <p className="mt-1.5 truncate text-xs text-humo/80">{movie.genres.map(g => g.name).join(", ")}</p>
          )}
        </div>
      </button>

      <SaveButton movie={toSaved(movie)} className="absolute right-2.5 top-2.5" />
    </article>
  );
}
