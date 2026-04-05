"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type PopularMovie = {
  id: number;
  title: string;
  posterPath: string | null;
};

function posterUrl(path: string | null): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/w500${path}`;
}

const CARD_W  = 160;
const CARD_H  = 240;
const RADIUS  = 400;
const N       = 8;

const SKELETON_COLORS = [
  "rgba(131,56,236,0.25)",
  "rgba(0,212,255,0.2)",
  "rgba(255,0,110,0.22)",
  "rgba(255,214,10,0.18)",
  "rgba(131,56,236,0.2)",
  "rgba(0,212,255,0.17)",
  "rgba(255,0,110,0.19)",
  "rgba(255,214,10,0.15)",
];

export default function MovieShowcase3D() {
  const [movies, setMovies]       = useState<PopularMovie[]>([]);
  const [paused, setPaused]       = useState(false);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const angleRef = useRef(0);
  const rafRef   = useRef<number | null>(null);
  const ringRef  = useRef<HTMLDivElement>(null);
  const lastRef  = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/popular")
      .then((r) => r.json())
      .then((data) => { if (data.movies) setMovies(data.movies); })
      .catch(() => {});
  }, []);

  // Manual RAF-based rotation so we can pause per-card hover smoothly
  useEffect(() => {
    const RPM   = 3;         // rotations per minute
    const DEG_S = (RPM * 360) / 60; // degrees per second

    function tick(ts: number) {
      if (!paused) {
        const delta = lastRef.current !== null ? (ts - lastRef.current) / 1000 : 0;
        angleRef.current = (angleRef.current + DEG_S * delta) % 360;
        if (ringRef.current) {
          ringRef.current.style.transform = `rotateX(-10deg) rotateY(${angleRef.current}deg)`;
        }
      }
      lastRef.current = ts;
      rafRef.current  = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [paused]);

  const cards = movies.length >= N ? movies.slice(0, N) : null;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        perspective: "1400px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "default",
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => { setPaused(false); setHoveredCard(null); }}
    >
      <div
        ref={ringRef}
        style={{
          position: "relative",
          width: CARD_W,
          height: CARD_H,
          transformStyle: "preserve-3d",
        }}
      >
        {Array.from({ length: N }).map((_, i) => {
          const angle  = (360 / N) * i;
          const movie  = cards?.[i] ?? null;
          const img    = movie ? posterUrl(movie.posterPath) : null;
          const isHov  = hoveredCard === i;
          const tmdbUrl = movie ? `https://www.themoviedb.org/movie/${movie.id}` : null;

          const cardStyle: React.CSSProperties = {
            position: "absolute",
            width: CARD_W,
            height: CARD_H,
            borderRadius: 14,
            overflow: "hidden",
            transform: `rotateY(${angle}deg) translateZ(${RADIUS}px) scale(${isHov ? 1.1 : 1})`,
            backfaceVisibility: "hidden",
            border: isHov
              ? "1px solid rgba(255,255,255,0.35)"
              : "1px solid rgba(255,255,255,0.1)",
            boxShadow: isHov
              ? "0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08)"
              : "0 8px 32px rgba(0,0,0,0.55)",
            transition: "transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
            cursor: tmdbUrl ? "pointer" : "default",
          };

          const inner = img ? (
            <Image
              src={img}
              alt={movie?.title ?? ""}
              fill
              sizes="160px"
              className="object-cover"
              style={{
                filter: isHov ? "brightness(1.05) saturate(1.1)" : "brightness(0.85)",
                transition: "filter 0.3s ease",
              }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", background: SKELETON_COLORS[i % SKELETON_COLORS.length] }} />
          );

          return tmdbUrl ? (
            <a
              key={i}
              href={tmdbUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={cardStyle}
              onMouseEnter={() => setHoveredCard(i)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {inner}
            </a>
          ) : (
            <div
              key={i}
              style={cardStyle}
              onMouseEnter={() => setHoveredCard(i)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
