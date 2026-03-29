import Image from "next/image";
import { posterUrl } from "@/lib/tmdb/client";
import type { RecommendedMovie } from "@/types/recommendation";

type Props = { movie: RecommendedMovie };

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 8 ? "#AAFF00" :
    score >= 7 ? "#FF6B00" :
    "#888888";
  return (
    <div
      className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
      style={{ background: "rgba(0,0,0,0.75)", border: `1.5px solid ${color}`, color }}
    >
      {score.toFixed(1)}
    </div>
  );
}

export default function MovieCard({ movie }: Props) {
  const imageUrl = posterUrl(movie.posterPath, "w342");

  return (
    <a
      href={movie.tmdbUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      {/* Poster */}
      <div className="relative overflow-hidden" style={{ aspectRatio: "2/3" }}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={movie.title}
            fill
            sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 20vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--bg-card2)" }}>
            <span className="text-5xl opacity-20">🎬</span>
          </div>
        )}
        {/* Gradient overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-20" style={{ background: "linear-gradient(to top, rgba(20,20,20,0.95) 0%, transparent 100%)" }} />
        <ScoreBadge score={movie.voteAverage} />
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2">
        <div>
          <h3 className="text-sm font-semibold leading-tight text-white truncate">
            {movie.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-xs" style={{ color: "var(--text-3)" }}>{movie.year}</span>
            {movie.genres.slice(0, 2).map(g => (
              <span
                key={g.id}
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-2)" }}
              >
                {g.name}
              </span>
            ))}
          </div>
        </div>
        <p className="text-xs italic leading-snug line-clamp-2" style={{ color: "var(--text-3)" }}>
          {movie.blurb}
        </p>
      </div>
    </a>
  );
}
