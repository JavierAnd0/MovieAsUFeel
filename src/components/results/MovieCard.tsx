"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { posterUrl } from "@/lib/tmdb/client";
import type { RecommendedMovie } from "@/types/recommendation";

type Props = {
  movie: RecommendedMovie;
  onSelect?: (id: number) => void;
};

function ScoreBar({ score }: { score: number }) {
  const pct   = Math.min(100, Math.max(0, score));
  const color = pct >= 70 ? "#00d4ff" : pct >= 45 ? "#8338ec" : "rgba(255,255,255,0.25)";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 3, background: "rgba(255,255,255,0.08)" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          style={{ height: "100%", background: color, borderRadius: 999 }}
        />
      </div>
      <span className="font-semibold flex-shrink-0" style={{ fontSize: 11, color }}>
        {pct}%
      </span>
    </div>
  );
}

export default function MovieCard({ movie, onSelect }: Props) {
  const rating   = (movie.voteAverage / 2).toFixed(1);
  const imageUrl = posterUrl(movie.posterPath, "w342");

  const sharedStyle = {
    border: movie.alreadySeen
      ? "1px solid rgba(255,255,255,0.05)"
      : "1px solid rgba(255,255,255,0.08)",
    background: movie.alreadySeen
      ? "rgba(255,255,255,0.02)"
      : "rgba(255,255,255,0.03)",
    opacity: movie.alreadySeen ? 0.75 : 1,
    transformPerspective: 900,
    cursor: "pointer",
    textDecoration: "none",
    display: "flex",
    flexDirection: "column" as const,
  };

  const sharedMotion = {
    className: "group flex flex-col rounded-2xl overflow-hidden",
    whileHover: {
      y: -6,
      rotateX: 2,
      rotateY: -2,
      borderColor: movie.alreadySeen ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.22)",
      boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
      opacity: 1,
    },
    transition: { type: "spring" as const, stiffness: 280, damping: 22 },
  };

  // When onSelect is provided → clickable div (opens modal)
  // Otherwise → anchor link to TMDB
  const CardEl = onSelect ? motion.div : motion.a;
  const cardProps = onSelect
    ? { ...sharedMotion, style: sharedStyle, onClick: () => onSelect(movie.tmdbId) }
    : { ...sharedMotion, style: sharedStyle, href: movie.tmdbUrl, target: "_blank", rel: "noopener noreferrer" };

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <CardEl {...(cardProps as any)}>
      {/* Poster */}
      <div className="relative overflow-hidden" style={{ aspectRatio: "2/3", background: "rgba(255,255,255,0.05)" }}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`Poster de ${movie.title}`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            style={{ filter: movie.alreadySeen ? "brightness(0.65) saturate(0.7)" : "none", transition: "filter 0.3s ease" }}
          />
        ) : (
          <div className="flex h-full items-center justify-center flex-col gap-2">
            <span style={{ fontSize: 36, opacity: 0.2 }}>🎬</span>
          </div>
        )}

        {/* "Already seen" overlay badge */}
        {movie.alreadySeen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="absolute top-0 left-0 right-0 bottom-0 flex items-end justify-center pb-3 pointer-events-none"
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{
              background: "rgba(10,10,15,0.82)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.7)",
            }}>
              <span>✓</span>
              <span>Ya vista</span>
            </div>
          </motion.div>
        )}

        {/* Score badge — top right */}
        <div className="absolute top-2.5 right-2.5">
          <div className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
            background: "rgba(10,10,15,0.75)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: movie.score >= 70 ? "#00d4ff"
                 : movie.score >= 45 ? "#a06bec"
                 : "rgba(255,255,255,0.45)",
          }}>
            {movie.score}%
          </div>
        </div>

        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0" style={{ height: 48, background: "linear-gradient(to top, rgba(10,10,15,0.7), transparent)" }} />
      </div>

      {/* Info */}
      <div className="flex flex-col gap-2.5 p-3.5">
        <div>
          <h3 className="text-sm font-bold leading-tight line-clamp-2 text-white" style={{ marginBottom: 3 }}>
            {movie.title}
          </h3>
          <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            <span>{movie.year}</span>
            <span>·</span>
            <span style={{ color: "rgba(255,214,10,0.75)" }}>★ {rating}</span>
            <span>/10</span>
          </div>
        </div>

        {/* Compatibility score bar */}
        <ScoreBar score={movie.score} />

        {/* Genres */}
        {movie.genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {movie.genres.slice(0, 3).map(g => (
              <span key={g.id} className="text-xs px-2 py-0.5 rounded-md font-medium" style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.09)",
                color: "rgba(255,255,255,0.5)",
              }}>
                {g.name}
              </span>
            ))}
          </div>
        )}

        {/* Blurb */}
        {movie.blurb && (
          <p className="text-xs italic leading-relaxed line-clamp-3" style={{ color: "rgba(255,255,255,0.38)" }}>
            &ldquo;{movie.blurb}&rdquo;
          </p>
        )}
      </div>
    </CardEl>
  );
}
