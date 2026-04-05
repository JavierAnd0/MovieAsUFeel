"use client";

import { useRef, useState, useEffect, Suspense, Component } from "react";
import type { ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Float, useTexture } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";

// ─── Types ────────────────────────────────────────────────────────────────────
type Movie = { id: number; title: string; posterPath: string | null };

// ─── Error boundary so a single bad texture never kills the ring ─────────────
class PosterErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { errored: boolean }
> {
  state = { errored: false };
  static getDerivedStateFromError() { return { errored: true }; }
  render() {
    return this.state.errored ? this.props.fallback : this.props.children;
  }
}

// ─── Skeleton placeholder ─────────────────────────────────────────────────────
function SkeletonCard({ angle, radius }: { angle: number; radius: number }) {
  const x = Math.sin(angle) * radius;
  const z = Math.cos(angle) * radius;
  return (
    <mesh position={[x, 0, z]} rotation={[0, -angle, 0]}>
      <planeGeometry args={[1.6, 2.4]} />
      <meshStandardMaterial color="#150825" roughness={0.95} />
    </mesh>
  );
}

// ─── Poster card with texture + emissive glow on hover ───────────────────────
function TexturedCard({
  url, angle, radius, hovered, onPointerEnter, onPointerLeave, onClick,
}: {
  url: string;
  angle: number;
  radius: number;
  hovered: boolean;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onClick: () => void;
}) {
  const texture = useTexture(url);
  const matRef  = useRef<THREE.MeshStandardMaterial>(null);
  const x = Math.sin(angle) * radius;
  const z = Math.cos(angle) * radius;

  useFrame(() => {
    if (!matRef.current) return;
    matRef.current.emissiveIntensity = THREE.MathUtils.lerp(
      matRef.current.emissiveIntensity,
      hovered ? 0.55 : 0,
      0.07,
    );
  });

  return (
    <Float floatIntensity={0.35} speed={1.4 + (angle % 0.8)} rotationIntensity={0.04}>
      <mesh
        position={[x, 0, z]}
        rotation={[0, -angle, 0]}
        onPointerEnter={(e) => { e.stopPropagation(); onPointerEnter(); }}
        onPointerLeave={(e) => { e.stopPropagation(); onPointerLeave(); }}
        onClick={(e)        => { e.stopPropagation(); onClick(); }}
      >
        <planeGeometry args={[1.6, 2.4]} />
        <meshStandardMaterial
          ref={matRef}
          map={texture}
          roughness={0.3}
          metalness={0.05}
          emissive={new THREE.Color("#00d4ff")}
          emissiveIntensity={0}
        />
      </mesh>
    </Float>
  );
}

// ─── Two slowly-orbiting coloured point lights ────────────────────────────────
function OrbitingLights() {
  const cyanRef   = useRef<THREE.PointLight>(null);
  const purpleRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (cyanRef.current) {
      cyanRef.current.position.set(
        Math.sin(t * 0.38) * 7,
        Math.sin(t * 0.22) * 2.5,
        Math.cos(t * 0.38) * 5,
      );
    }
    if (purpleRef.current) {
      purpleRef.current.position.set(
        Math.sin(t * 0.38 + Math.PI) * 7,
        Math.cos(t * 0.22) * 2.5,
        Math.cos(t * 0.38 + Math.PI) * 5,
      );
    }
  });

  return (
    <>
      <pointLight ref={cyanRef}   color="#00d4ff" intensity={10} distance={22} decay={2} />
      <pointLight ref={purpleRef} color="#8338ec" intensity={7}  distance={22} decay={2} />
    </>
  );
}

// ─── The rotating ring of poster cards ────────────────────────────────────────
const N      = 8;
const RADIUS = 4.2;

function MovieRing({ movies }: { movies: Movie[] }) {
  const ringRef      = useRef<THREE.Group>(null);
  const hoveredRef   = useRef(-1);
  const [hovered, setHovered] = useState(-1);

  // Keep a ref in sync so useFrame can read without re-subscribing
  useEffect(() => { hoveredRef.current = hovered; }, [hovered]);

  useFrame((_, delta) => {
    if (!ringRef.current || hoveredRef.current !== -1) return;
    ringRef.current.rotation.y += delta * 0.28;
  });

  // Always render N slots — fill missing slots with skeletons
  const slots = Array.from({ length: N }, (_, i) => movies[i] ?? null);

  return (
    <group ref={ringRef}>
      {slots.map((movie, i) => {
        const angle = (2 * Math.PI / N) * i;

        if (!movie?.posterPath) {
          return <SkeletonCard key={i} angle={angle} radius={RADIUS} />;
        }

        const url = `https://image.tmdb.org/t/p/w342${movie.posterPath}`;

        return (
          <PosterErrorBoundary
            key={movie.id}
            fallback={<SkeletonCard angle={angle} radius={RADIUS} />}
          >
            <Suspense fallback={<SkeletonCard angle={angle} radius={RADIUS} />}>
              <TexturedCard
                url={url}
                angle={angle}
                radius={RADIUS}
                hovered={hovered === i}
                onPointerEnter={() => setHovered(i)}
                onPointerLeave={() => setHovered(-1)}
                onClick={() =>
                  window.open(`https://www.themoviedb.org/movie/${movie.id}`, "_blank")
                }
              />
            </Suspense>
          </PosterErrorBoundary>
        );
      })}
    </group>
  );
}

// ─── Exported component ───────────────────────────────────────────────────────
export default function HeroScene() {
  const [movies, setMovies] = useState<Movie[]>([]);

  useEffect(() => {
    fetch("/api/popular")
      .then((r) => r.json())
      .then((d) => setMovies(d.movies ?? []))
      .catch(() => {});
  }, []);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0.4, 9], fov: 55 }}
        style={{ background: "transparent" }}
      >
        {/* Soft dark ambient so shadows don't go completely black */}
        <ambientLight color="#0d0520" intensity={2.5} />

        {/* Orbiting cyan + purple key lights */}
        <OrbitingLights />

        {/* Star field */}
        <Stars radius={80} depth={40} count={280} factor={3} fade speed={0.35} />

        {/* Poster ring — wrapped in outer Suspense so skeletons appear immediately */}
        <Suspense fallback={null}>
          <MovieRing movies={movies} />
        </Suspense>

        {/* Post-processing */}
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            intensity={1.5}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
