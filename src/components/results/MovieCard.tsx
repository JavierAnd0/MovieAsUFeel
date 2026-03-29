import Image from "next/image";
import Badge from "@/components/ui/Badge";
import { posterUrl } from "@/lib/tmdb/client";
import type { RecommendedMovie } from "@/types/recommendation";

type Props = { movie: RecommendedMovie };

export default function MovieCard({ movie }: Props) {
  const stars = Math.round((movie.voteAverage / 2) * 10) / 10;
  const starsDisplay = "★".repeat(Math.round(stars)) + "☆".repeat(5 - Math.round(stars));
  const imageUrl = posterUrl(movie.posterPath, "w342");

  return (
    <a
      href={movie.tmdbUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-xl border border-gray-800 bg-gray-900 overflow-hidden transition-all duration-200 hover:border-gray-700 hover:shadow-lg hover:shadow-black/30 hover:-translate-y-0.5"
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-gray-800">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`Poster de ${movie.title}`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl text-gray-700">🎬</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-100 leading-tight line-clamp-2">
            {movie.title}
          </h3>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
            <span>{movie.year}</span>
            <span>·</span>
            <span className="text-yellow-500/80" title={`${movie.voteAverage}/10`}>
              {starsDisplay}
            </span>
          </div>
        </div>

        {movie.genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {movie.genres.slice(0, 2).map((g) => (
              <Badge key={g.id}>{g.name}</Badge>
            ))}
          </div>
        )}

        <p className="mt-auto text-xs italic text-gray-500 leading-snug line-clamp-2">
          {movie.blurb}
        </p>
      </div>
    </a>
  );
}
