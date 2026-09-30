"use client";

import { motion } from "framer-motion";
import MovieCard from "./MovieCard";
import type { RecommendedMovie } from "@/types/recommendation";

type Props = {
  movies: RecommendedMovie[];
  onSelect: (id: number) => void;
};

export default function MovieGrid({ movies, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {movies.map(movie => (
        <motion.div
          key={movie.tmdbId}
          layout="position"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <MovieCard movie={movie} onSelect={onSelect} />
        </motion.div>
      ))}
    </div>
  );
}
