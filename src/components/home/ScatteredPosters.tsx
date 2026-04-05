"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useAnimationFrame,
  useTransform,
} from "framer-motion";

type Movie = { id: number; posterPath: string | null };

// ─── Card constants ────────────────────────────────────────────────────────
const CARD_W            = 118;
const CARD_H            = 177;
const REPULSION_RADIUS  = 230;
const REPULSION_FORCE   = 140;

// ─── Ring definitions ──────────────────────────────────────────────────────
// [radius px, card count, orbit seconds, direction, start angle deg]
const RING_DEFS = [
  { radius: 230, count: 4, duration: 38, dir:  1 as const, startAngle: 22  },
  { radius: 370, count: 5, duration: 60, dir: -1 as const, startAngle:  5  },
  { radius: 510, count: 7, duration: 50, dir:  1 as const, startAngle: 32  },
  { radius: 650, count: 5, duration: 72, dir: -1 as const, startAngle: 48  },
] as const;

// ─── Static card tilt values (no Math.random → no hydration mismatch) ─────
const TILTS = [
  -13,  8, -9, 14, -6, 11, -15,  7,
  -10, 16, -5, 12, -8, 13, -11,  6,
  -14,  9, -7, 15, -12, 10,
];

// ─── Build card metadata at module level (never re-computed) ──────────────
type CardInfo = {
  angleDeg:  number;        // starting position on orbit (radians = angleDeg*π/180)
  radius:    number;        // orbit radius in px from viewport center
  duration:  number;        // seconds per full revolution
  dir:       1 | -1;        // +1 clockwise, -1 counter-clockwise
  sizeScale: number;        // card size multiplier
  tiltDeg:   number;        // static card tilt for visual interest
  fadeDelay: number;        // stagger for opacity fade-in
};

const CARDS: CardInfo[] = (() => {
  const list: CardInfo[] = [];
  let gi = 0;
  RING_DEFS.forEach((ring, ri) => {
    for (let j = 0; j < ring.count; j++) {
      list.push({
        angleDeg:  ring.startAngle + (j / ring.count) * 360,
        radius:    ring.radius,
        duration:  ring.duration,
        dir:       ring.dir,
        sizeScale: 0.62 + ri * 0.11,        // inner rings smaller → perspective depth
        tiltDeg:   TILTS[gi % TILTS.length],
        fadeDelay: gi * 0.13,
      });
      gi++;
    }
  });
  return list;
})();
// 4 + 5 + 7 + 5 = 21 cards total

// ─── Individual orbiting poster card ─────────────────────────────────────
function OrbitalCard({ info, src }: { info: CardInfo; src: string | null }) {
  const cardRef = useRef<HTMLDivElement>(null);

  // ── Orbital x / y (updated every frame via rAF, no React re-renders) ──
  const orbitX = useMotionValue(0);
  const orbitY = useMotionValue(0);

  // ── Mouse repulsion ───────────────────────────────────────────────────
  const rawRepX = useMotionValue(0);
  const rawRepY = useMotionValue(0);
  const repX    = useSpring(rawRepX, { stiffness: 140, damping: 14, mass: 0.6 });
  const repY    = useSpring(rawRepY, { stiffness: 140, damping: 14, mass: 0.6 });

  // ── Combine orbit + repulsion into final position ─────────────────────
  const finalX = useTransform(
    [orbitX, repX],
    ([o, r]: number[]) => o + r,
  );
  const finalY = useTransform(
    [orbitY, repY],
    ([o, r]: number[]) => o + r,
  );

  // ── 60 fps orbital update ─────────────────────────────────────────────
  useAnimationFrame((time) => {
    const t     = time / 1000; // seconds since page load
    const omega = (info.dir * 2 * Math.PI) / info.duration;
    const angle = (info.angleDeg * Math.PI) / 180 + omega * t;

    // Always track current viewport center (handles resize)
    const cx = window.innerWidth  / 2;
    const cy = window.innerHeight / 2;

    const w = CARD_W * info.sizeScale;
    const h = CARD_H * info.sizeScale;

    // Place card center on the orbit circle, then offset by half card size
    orbitX.set(cx + Math.cos(angle) * info.radius - w / 2);
    orbitY.set(cy + Math.sin(angle) * info.radius - h / 2);
  });

  // ── Mouse repulsion listener ──────────────────────────────────────────
  useEffect(() => {
    // Skip on touch devices — no cursor to repel
    if (window.matchMedia("(pointer: coarse)").matches) return;

    function onMouseMove(e: MouseEvent) {
      const el = cardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dx   = e.clientX - cx;
      const dy   = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < REPULSION_RADIUS && dist > 1) {
        const t     = 1 - dist / REPULSION_RADIUS;
        const force = t * t * REPULSION_FORCE;
        rawRepX.set(-(dx / dist) * force);
        rawRepY.set(-(dy / dist) * force);
      } else {
        rawRepX.set(0);
        rawRepY.set(0);
      }
    }

    function onMouseLeave() {
      rawRepX.set(0);
      rawRepY.set(0);
    }

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseleave", onMouseLeave);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [rawRepX, rawRepY]);

  const w = CARD_W * info.sizeScale;
  const h = CARD_H * info.sizeScale;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: src ? 0.82 : 0 }}
      transition={{ duration: 1.4, delay: info.fadeDelay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position:     "absolute",
        left:         0,
        top:          0,
        x:            finalX,
        y:            finalY,
        rotate:       info.tiltDeg,
        width:        w,
        height:       h,
        borderRadius: 12 * info.sizeScale,
        overflow:     "hidden",
        border:       "1px solid rgba(240,236,227,0.08)",
        boxShadow:    "0 12px 44px rgba(0,0,0,0.7)",
        background:   "#18161E",
        willChange:   "transform",
        flexShrink:   0,
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
  );
}

// ─── Main component ────────────────────────────────────────────────────────
export default function ScatteredPosters() {
  const [movies, setMovies] = useState<Movie[]>([]);

  useEffect(() => {
    fetch("/api/popular")
      .then(r => r.json())
      .then(d => setMovies(d.movies ?? []))
      .catch(() => {});
  }, []);

  return (
    /*
     * Hidden on mobile — orbital animation is for desktop only.
     * z-[5]: renders above the backdrop gradients (z:auto) so cards are
     * clearly visible, but below the hero content (z-10) and navbar (z-20).
     * pointer-events-none: overlaid decorative only.
     */
    <div
      className="hidden sm:block absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 5 }}
      aria-hidden="true"
    >
      {CARDS.map((info, i) => {
        const movie = movies[i % Math.max(movies.length, 1)];
        const src   = movie?.posterPath
          ? `https://image.tmdb.org/t/p/w342${movie.posterPath}`
          : null;
        return <OrbitalCard key={i} info={info} src={src} />;
      })}
    </div>
  );
}
