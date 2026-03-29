import MovieCard from "./MovieCard";
import type { RecommendedMovie } from "@/types/recommendation";

type Props = { movies: RecommendedMovie[] };

export default function MovieGrid({ movies }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {movies.map((movie) => (
        <MovieCard key={movie.tmdbId} movie={movie} />
      ))}
    </div>
  );
}
