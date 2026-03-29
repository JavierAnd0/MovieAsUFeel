import MovieCard from "./MovieCard";
import type { RecommendedMovie } from "@/types/recommendation";

type Props = { movies: RecommendedMovie[] };

export default function MovieGrid({ movies }: Props) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {movies.map((movie) => (
        <MovieCard key={movie.tmdbId} movie={movie} />
      ))}
    </div>
  );
}
