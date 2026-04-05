"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useState } from "react";

type Movie = { id: number; posterPath: string | null };

// [left%, top%, rotateDeg, scale, driftAmp, driftDuration, driftDelay]
const SLOTS: [number, number, number, number, number, number, number][] = [
  [ 0,   4,  -13, 0.80, 18, 22, 0.0],
  [11,  -3,    9, 0.95, 14, 20, 2.2],
  [23,  -5,   -6, 0.72, 20, 25, 0.8],
  [37,  -7,    4, 0.83, 16, 18, 4.0],
  [54,  -6,   -4, 0.78, 22, 23, 1.4],
  [67,  -4,   10, 0.87, 14, 19, 3.0],
  [79,  -2,  -12, 0.82, 18, 24, 0.4],
  [91,   3,   16, 0.68, 20, 21, 3.6],
  [-2,  30,  -17, 0.86, 16, 22, 1.8],
  [ 2,  52,    7, 0.68, 22, 26, 0.6],
  [ 0,  70,  -10, 0.76, 18, 20, 3.2],
  [90,  28,   18, 0.74, 16, 21, 1.2],
  [93,  50,   -9, 0.90, 20, 23, 2.6],
  [91,  68,   13, 0.70, 18, 25, 0.2],
  [ 4,  80,   12, 0.70, 20, 22, 3.8],
  [18,  87,   -8, 0.79, 16, 19, 1.0],
  [34,  89,    5, 0.66, 22, 24, 2.4],
  [58,  88,   -5, 0.73, 18, 21, 0.6],
  [73,  86,    9, 0.78, 16, 23, 3.4],
  [86,  79,  -15, 0.65, 20, 20, 0.8],
];

// Precompute organic drift keyframes at module level (never re-computed).
// Using sin/cos with different frequencies per axis → Lissajous-like paths.
const DRIFTS = SLOTS.map(([,,,, amp,, ], i) => {
  const fx = 2.1 + i * 0.13; // unique x frequency
  const fy = 1.7 + i * 0.11; // unique y frequency (different → organic)
  const steps = 8;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let k = 0; k <= steps; k++) {
    const t = (k / steps) * Math.PI * 2;
    xs.push(Math.sin(fx + t) * amp);
    ys.push(Math.cos(fy + t) * amp * 0.55);
  }
  return { x: xs, y: ys };
});

const CARD_W = 138;
const CARD_H = 207;
const REPULSION_RADIUS = 210;  // px — how far the repulsion reaches
const REPULSION_STRENGTH = 140; // px — max push distance

// ─── Individual card with drift + repulsion physics ───────────────────────────
function PosterCard({
  index, left, top, rotate, scale, driftDur, driftDelay, src,
}: {
  index: number;
  left: number; top: number; rotate: number; scale: number;
  driftDur: number; driftDelay: number;
  src: string | null;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Spring physics for mouse repulsion
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, { stiffness: 140, damping: 14, mass: 0.6 });
  const springY = useSpring(rawY, { stiffness: 140, damping: 14, mass: 0.6 });

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const el = cardRef.current;
      if (!el) return;
      // getBoundingClientRect accounts for drift + any existing spring offset
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width  / 2;
      const cy = rect.top  + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < REPULSION_RADIUS && dist > 1) {
        // Quadratic falloff: strongest near center, fades out at radius edge
        const t = 1 - dist / REPULSION_RADIUS;
        const force = t * t * REPULSION_STRENGTH;
        rawX.set(-(dx / dist) * force);
        rawY.set(-(dy / dist) * force);
      } else {
        rawX.set(0);
        rawY.set(0);
      }
    }

    function onMouseLeave() {
      rawX.set(0);
      rawY.set(0);
    }

    // Skip repulsion on touch-only devices (phones/tablets have no mouse)
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (isTouch) return;

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseleave", onMouseLeave);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [rawX, rawY]);

  const drift = DRIFTS[index];

  return (
    // Anchor: pure CSS position, no animation
    <div style={{ position: "absolute", left: `${left}%`, top: `${top}%` }}>

      {/*
       * Layer 1 — DRIFT
       * Slow organic Lissajous path. `animate` prop never changes after mount
       * so Framer Motion never restarts this animation on re-renders.
       */}
      <motion.div
        animate={{ x: drift.x, y: drift.y }}
        transition={{
          duration: driftDur,
          repeat: Infinity,
          ease: "easeInOut",
          delay: driftDelay,
          repeatType: "loop",
        }}
      >
        {/*
         * Layer 2 — REPULSION (spring physics)
         * Driven by rawX/rawY motion values updated on mousemove.
         * Completely independent from the drift above.
         */}
        <motion.div style={{ x: springX, y: springY }}>

          {/*
           * Layer 3 — FADE-IN + CARD
           * Ref lives here so getBoundingClientRect gives correct visual position
           * after both drift and repulsion are applied.
           */}
          <motion.div
            ref={cardRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: src ? 0.88 : 0, scale: src ? 1 : 0.9 }}
            transition={{ duration: 1.4, delay: driftDelay + 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width:        CARD_W * scale,
              height:       CARD_H * scale,
              rotate,
              borderRadius: 14 * scale,
              overflow:     "hidden",
              border:       "1px solid rgba(240,236,227,0.08)",
              boxShadow:    "0 12px 44px rgba(0,0,0,0.65)",
              background:   "#18161E",
              willChange:   "transform",
            }}
          >
            {src && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                loading="lazy"
              />
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ScatteredPosters() {
  const [movies, setMovies] = useState<Movie[]>([]);

  useEffect(() => {
    fetch("/api/popular")
      .then(r => r.json())
      .then(d => setMovies(d.movies ?? []))
      .catch(() => {});
  }, []);

  return (
    /* Hidden on mobile (< 768px) — the hero looks great with just the gradient */
    <div className="hidden sm:block absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {SLOTS.map(([left, top, rotate, scale,, dur, delay], i) => {
        const movie = movies[i % Math.max(movies.length, 1)];
        const src   = movie?.posterPath
          ? `https://image.tmdb.org/t/p/w342${movie.posterPath}`
          : null;

        return (
          <PosterCard
            key={i}
            index={i}
            left={left}   top={top}
            rotate={rotate} scale={scale}
            driftDur={dur}  driftDelay={delay}
            src={src}
          />
        );
      })}
    </div>
  );
}
