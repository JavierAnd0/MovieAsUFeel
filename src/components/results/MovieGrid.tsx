"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import MovieCard from "./MovieCard";
import MovieDetailModal from "@/components/home/MovieDetailModal";
import type { RecommendedMovie } from "@/types/recommendation";

type Props = { movies: RecommendedMovie[] };

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.055, delayChildren: 0.05 },
  },
};

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const itemVariants = {
  hidden:  { opacity: 0, y: 22, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.42, ease: EASE },
  },
};

export default function MovieGrid({ movies }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <>
      <motion.div
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {movies.map((movie) => (
          <motion.div key={movie.tmdbId} variants={itemVariants}>
            <MovieCard
              movie={movie}
              onSelect={(id) => setSelectedId(id)}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Cinematic detail modal */}
      <MovieDetailModal
        movieId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}
