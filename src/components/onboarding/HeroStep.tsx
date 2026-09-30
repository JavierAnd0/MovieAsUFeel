"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import NavBar, { WatchlistLink } from "@/components/ui/NavBar";
import Icon from "@/components/ui/Icon";
import MovieSearch from "@/components/home/MovieSearch";

const ScatteredPosters = dynamic(() => import("@/components/home/ScatteredPosters"), { ssr: false });

type Props = {
  onStart: () => void;
  /** Set when a Letterboxd profile is already loaded in this session. */
  returningUser?: string;
  onContinue?: () => void;
};

export default function HeroStep({ onStart, returningUser, onContinue }: Props) {
  const [mobileSearch, setMobileSearch] = useState(false);

  return (
    <section className="relative w-full overflow-hidden" style={{ height: "100dvh" }}>
      <ScatteredPosters />

      {/* Vignette over the orbiting posters: keeps the centre readable, edges dissolve */}
      <div
        className="pointer-events-none absolute inset-0 z-[9]"
        style={{
          background: [
            "radial-gradient(ellipse 58% 62% at 50% 55%, rgba(18,15,12,0.92) 0%, rgba(18,15,12,0.55) 42%, transparent 68%)",
            "linear-gradient(to top, rgba(18,15,12,0.98) 0%, rgba(18,15,12,0.5) 18%, transparent 38%)",
            "linear-gradient(to bottom, rgba(18,15,12,0.85) 0%, transparent 22%)",
          ].join(", "),
        }}
      />

      <NavBar
        floating
        center={<MovieSearch />}
        right={
          <>
            <button
              onClick={() => setMobileSearch(true)}
              aria-label="Buscar una película"
              className="btn btn-ghost btn-sm btn-icon md:hidden"
            >
              <Icon name="search" size={16} />
            </button>
            <WatchlistLink />
          </>
        }
      />

      {mobileSearch && (
        <div className="fixed inset-0 z-50 flex flex-col bg-sala/95 backdrop-blur-md" role="dialog" aria-label="Buscar una película">
          <div className="flex items-center gap-3 border-b border-linea px-4 pb-4 pt-6">
            <div className="flex-1"><MovieSearch autoFocus /></div>
            <button onClick={() => setMobileSearch(false)} aria-label="Cerrar búsqueda" className="btn btn-ghost btn-sm btn-icon">
              <Icon name="close" size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-5 pb-16 pt-24 text-center">
        <motion.h1
          initial={{ opacity: 0, letterSpacing: "0.12em" }}
          animate={{ opacity: 1, letterSpacing: "0.01em" }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-pantalla"
          style={{ fontSize: "clamp(64px, 12vw, 164px)", textShadow: "0 0 80px rgba(207,164,94,0.18)" }}
        >
          Movies as<br />you feel
        </motion.h1>

        <p className="mb-10 mt-6 max-w-md text-[clamp(15px,1.7vw,18px)] leading-relaxed text-humo">
          Dinos cómo te sientes y te proponemos qué ver esta noche, a partir de lo que ya has visto en Letterboxd.
        </p>

        <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
          {returningUser && onContinue ? (
            <>
              <button onClick={onContinue} className="btn btn-primary h-13 w-full px-7 text-[15px] sm:w-auto">
                Seguir como @{returningUser}
              </button>
              <button onClick={onStart} className="btn btn-ghost h-13 w-full px-6 sm:w-auto">
                Usar otro perfil
              </button>
            </>
          ) : (
            <button onClick={onStart} className="btn btn-primary h-13 w-full px-8 text-[15px] sm:w-auto">
              Empezar con mi Letterboxd
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
