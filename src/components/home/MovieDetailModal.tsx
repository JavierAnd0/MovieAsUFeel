"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────
type Genre = { id: number; name: string };

type MovieDetail = {
  id: number;
  title: string;
  tagline: string;
  overview: string;
  year: string;
  runtime: string;
  runtimeRaw: number;
  voteAverage: number | null;
  voteCount: string;
  posterPath: string | null;
  backdropPath: string | null;
  genres: Genre[];
  director: string | null;
  cast: string[];
  certification: string | null;
  trailerKey: string | null;
};

type Props = {
  movieId: number | null;
  onClose: () => void;
};

// ─── Inner modal ──────────────────────────────────────────────────────────────
function ModalInner({ movieId, onClose }: { movieId: number; onClose: () => void }) {
  const [data, setData]       = useState<MovieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setData(null);

    fetch(`/api/movie/${movieId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d: MovieDetail) => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [movieId]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const bgSrc = data?.backdropPath
    ? `https://image.tmdb.org/t/p/w1280${data.backdropPath}`
    : data?.posterPath
    ? `https://image.tmdb.org/t/p/w780${data.posterPath}`
    : null;

  const posterSrc = data?.posterPath
    ? `https://image.tmdb.org/t/p/w342${data.posterPath}`
    : null;

  const trailerUrl = data?.trailerKey
    ? `https://www.youtube.com/watch?v=${data.trailerKey}`
    : null;

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 9000, background: "#0A0A0E" }}
    >
      {/* ── Backdrop ────────────────────────────────────────────────────── */}
      {bgSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bgSrc}
          alt=""
          style={{
            position: "absolute", inset: 0, zIndex: 1,
            width: "100%", height: "100%",
            objectFit: "cover",
            filter: "brightness(0.28) saturate(0.65)",
          }}
        />
      )}

      {/* ── Gradient — heavy bottom vignette ────────────────────────────── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
        background: [
          "linear-gradient(to top,    #0A0A0E 0%,  rgba(10,10,14,0.96) 22%, rgba(10,10,14,0.55) 52%, transparent 100%)",
          "linear-gradient(to right,  rgba(10,10,14,0.80) 0%, rgba(10,10,14,0.25) 42%, transparent 72%)",
          "linear-gradient(to bottom, rgba(10,10,14,0.55) 0%, transparent 18%)",
        ].join(", "),
      }} />

      {/* ── Back button ─────────────────────────────────────────────────── */}
      <button
        onClick={e => { e.stopPropagation(); onClose(); }}
        style={{
          position: "absolute", top: 28, left: 32, zIndex: 30,
          display: "flex", alignItems: "center", gap: 7,
          background: "rgba(10,10,14,0.45)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(240,236,227,0.12)",
          borderRadius: 8,
          padding: "7px 14px",
          cursor: "pointer",
          color: "rgba(240,236,227,0.65)",
          fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
          textTransform: "uppercase",
          transition: "color 0.15s, background 0.15s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = "#F0ECE3";
          e.currentTarget.style.background = "rgba(240,236,227,0.12)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = "rgba(240,236,227,0.65)";
          e.currentTarget.style.background = "rgba(10,10,14,0.45)";
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Back
      </button>

      {/* ── Loading state ───────────────────────────────────────────────── */}
      {loading && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            border: "2px solid rgba(240,236,227,0.1)",
            borderTop: "2px solid rgba(201,169,110,0.7)",
            animation: "spin 0.9s linear infinite",
          }} />
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {error && !loading && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: "absolute", inset: 0, zIndex: 20,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: 12,
          }}
        >
          <span style={{ fontSize: 15, color: "rgba(240,236,227,0.4)", letterSpacing: "0.04em" }}>
            No se pudo cargar la información.
          </span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN CONTENT — only shown when data loaded
      ═══════════════════════════════════════════════════════════════════ */}
      {data && !loading && (
        isMobile ? (
          /* ── MOBILE LAYOUT: vertical scrollable ─────────────────────── */
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: "absolute", inset: 0, zIndex: 20,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              display: "flex", flexDirection: "column",
              alignItems: "center",
              padding: "88px 20px 48px",
              gap: 0,
            }}
          >
            {/* Poster — centered */}
            {posterSrc && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                style={{
                  width: 130, flexShrink: 0,
                  borderRadius: 10,
                  overflow: "hidden",
                  boxShadow: "0 16px 60px rgba(0,0,0,0.85), 0 0 0 1px rgba(240,236,227,0.07)",
                  marginBottom: 20,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={posterSrc} alt={data.title} style={{ width: "100%", display: "block" }} />
              </motion.div>
            )}

            {/* Year + Rating */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.18 }}
              style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}
            >
              {data.year && <span style={{ fontSize: 12, color: "rgba(240,236,227,0.35)", letterSpacing: "0.08em" }}>{data.year}</span>}
              {data.voteAverage && <span style={{ fontSize: 12, color: "#C9A96E", fontWeight: 700 }}>★ {data.voteAverage}</span>}
              {data.voteCount !== "0" && <span style={{ fontSize: 11, color: "rgba(240,236,227,0.25)" }}>{data.voteCount} reseñas</span>}
            </motion.div>

            {/* Runtime + Cert */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.2 }}
              style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}
            >
              {data.runtime && (
                <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", color: "#F0ECE3", lineHeight: 1 }}>
                  {data.runtime}
                </span>
              )}
              {data.certification && (
                <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(240,236,227,0.5)", border: "1.5px solid rgba(240,236,227,0.25)", borderRadius: 5, padding: "3px 9px", letterSpacing: "0.06em", lineHeight: 1 }}>
                  {data.certification}
                </span>
              )}
            </motion.div>

            {/* Play Trailer */}
            {trailerUrl && (
              <motion.a
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.22 }}
                href={trailerUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 22px", borderRadius: 8, marginBottom: 24,
                  background: "rgba(240,236,227,0.08)",
                  border: "1px solid rgba(240,236,227,0.15)",
                  color: "#F0ECE3", fontSize: 11, fontWeight: 700,
                  letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
                Play Trailer
              </motion.a>
            )}

            {/* Big Title */}
            <motion.h1
              className="font-display"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.14 }}
              style={{
                fontSize: "clamp(44px, 10vw, 72px)",
                fontWeight: 400,
                lineHeight: 0.9,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                color: "#F0ECE3",
                margin: "0 0 18px",
                textAlign: "center",
                textShadow: "0 4px 32px rgba(0,0,0,0.8)",
              }}
            >
              {data.title}
            </motion.h1>

            {/* Director + Stars */}
            {(data.director || data.cast.length > 0) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35, delay: 0.26 }}
                style={{ marginBottom: 16, textAlign: "center" }}
              >
                {data.director && (
                  <p style={{ fontSize: 13, margin: "0 0 5px", letterSpacing: "0.02em" }}>
                    <span style={{ color: "rgba(240,236,227,0.35)", fontWeight: 500 }}>Director</span>
                    <span style={{ color: "rgba(240,236,227,0.25)" }}> — </span>
                    <span style={{ color: "rgba(240,236,227,0.72)", fontWeight: 600 }}>{data.director}</span>
                  </p>
                )}
                {data.cast.length > 0 && (
                  <p style={{ fontSize: 12, margin: 0, letterSpacing: "0.02em", color: "rgba(240,236,227,0.5)" }}>
                    {data.cast.slice(0, 3).join(" · ")}
                  </p>
                )}
              </motion.div>
            )}

            {/* Genres */}
            {data.genres.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35, delay: 0.3 }}
                style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 4, marginBottom: 24 }}
              >
                {data.genres.slice(0, 5).map(g => (
                  <span key={g.id} style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(240,236,227,0.4)", padding: "3px 9px", borderRadius: 20, border: "1px solid rgba(240,236,227,0.12)" }}>
                    {g.name}
                  </span>
                ))}
              </motion.div>
            )}

            {/* Overview */}
            {data.overview && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.38 }}
                style={{ width: "100%", marginBottom: 24 }}
              >
                <div style={{ width: "100%", height: 1, marginBottom: 14, background: "linear-gradient(to right, transparent, rgba(240,236,227,0.1), transparent)" }} />
                <p style={{ fontSize: 13, lineHeight: 1.8, color: "rgba(240,236,227,0.5)", margin: 0, textAlign: "center" }}>
                  {data.overview}
                </p>
              </motion.div>
            )}

            {/* TMDB link */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.54 }}
            >
              <a
                href={`https://www.themoviedb.org/movie/${data.id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "10px 20px", borderRadius: 8,
                  border: "1px solid rgba(201,169,110,0.22)",
                  background: "rgba(201,169,110,0.06)",
                  color: "#C9A96E", fontSize: 11, fontWeight: 700,
                  letterSpacing: "0.07em", textTransform: "uppercase", textDecoration: "none",
                }}
              >
                Ver en TMDB
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            </motion.div>
          </div>
        ) : (
          /* ── DESKTOP LAYOUT: cinematic two-column ───────────────────── */
          <>
            {/* RIGHT COLUMN: poster + trailer */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              onClick={e => e.stopPropagation()}
              style={{
                position: "absolute",
                top: "10%", right: "4.5%",
                zIndex: 20,
                display: "flex", flexDirection: "column",
                alignItems: "center",
                gap: 14,
                width: "clamp(160px, 16vw, 210px)",
              }}
            >
              {/* Poster */}
              {posterSrc && (
                <div style={{
                  width: "100%",
                  aspectRatio: "2/3",
                  borderRadius: 12,
                  overflow: "hidden",
                  boxShadow: "0 24px 80px rgba(0,0,0,0.85), 0 0 0 1px rgba(240,236,227,0.07)",
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={posterSrc}
                    alt={data.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </div>
              )}

              {/* Play Trailer */}
              {trailerUrl ? (
                <a
                  href={trailerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    width: "100%", padding: "10px 0", justifyContent: "center",
                    borderRadius: 8,
                    background: "rgba(240,236,227,0.08)",
                    border: "1px solid rgba(240,236,227,0.15)",
                    color: "#F0ECE3",
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(240,236,227,0.14)";
                    e.currentTarget.style.borderColor = "rgba(240,236,227,0.3)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "rgba(240,236,227,0.08)";
                    e.currentTarget.style.borderColor = "rgba(240,236,227,0.15)";
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                  Play Trailer
                </a>
              ) : (
                <a
                  href={`https://www.themoviedb.org/movie/${data.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    width: "100%", padding: "10px 0", justifyContent: "center",
                    borderRadius: 8,
                    background: "rgba(201,169,110,0.08)",
                    border: "1px solid rgba(201,169,110,0.25)",
                    color: "#C9A96E",
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                  }}
                >
                  Ver en TMDB
                </a>
              )}

              {/* Small metadata row */}
              <div style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 4,
                textAlign: "center",
              }}>
                {data.voteCount !== "0" && data.voteAverage && (
                  <span style={{ fontSize: 11, color: "rgba(240,236,227,0.35)", letterSpacing: "0.05em" }}>
                    {data.voteCount} RESEÑAS · ★ {data.voteAverage}
                  </span>
                )}
                {data.year && (
                  <span style={{ fontSize: 11, color: "rgba(240,236,227,0.25)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {data.year}
                  </span>
                )}
              </div>
            </motion.div>

            {/* BOTTOM-LEFT CONTENT */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
              onClick={e => e.stopPropagation()}
              style={{
                position: "absolute",
                bottom: 0, left: 0,
                zIndex: 20,
                width: "clamp(320px, 58vw, 760px)",
                padding: "0 48px 44px",
                display: "flex", flexDirection: "column",
              }}
            >
              {/* Runtime + Certification */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
                {data.runtime && (
                  <span style={{ fontSize: "clamp(28px, 3.2vw, 46px)", fontWeight: 800, letterSpacing: "-0.02em", color: "#F0ECE3", lineHeight: 1 }}>
                    {data.runtime}
                  </span>
                )}
                {data.certification && (
                  <span style={{ fontSize: "clamp(13px, 1.4vw, 18px)", fontWeight: 700, color: "rgba(240,236,227,0.5)", border: "1.5px solid rgba(240,236,227,0.25)", borderRadius: 5, padding: "3px 9px", letterSpacing: "0.06em", lineHeight: 1 }}>
                    {data.certification}
                  </span>
                )}
                {!data.certification && data.voteAverage && (
                  <span style={{ fontSize: "clamp(13px, 1.4vw, 18px)", fontWeight: 700, color: "#C9A96E", letterSpacing: "0.03em" }}>
                    ★ {data.voteAverage}
                  </span>
                )}
              </div>

              {/* Director */}
              {data.director && (
                <p style={{ fontSize: 13, margin: "0 0 6px 0", letterSpacing: "0.02em" }}>
                  <span style={{ color: "rgba(240,236,227,0.35)", fontWeight: 500 }}>Director</span>
                  <span style={{ color: "rgba(240,236,227,0.25)" }}> — </span>
                  <span style={{ color: "rgba(240,236,227,0.72)", fontWeight: 600 }}>{data.director}</span>
                </p>
              )}

              {/* Stars */}
              {data.cast.length > 0 && (
                <p style={{ fontSize: 13, margin: "0 0 28px 0", letterSpacing: "0.02em" }}>
                  <span style={{ color: "rgba(240,236,227,0.35)", fontWeight: 500 }}>Stars</span>
                  <span style={{ color: "rgba(240,236,227,0.25)" }}> — </span>
                  <span style={{ color: "rgba(240,236,227,0.65)" }}>{data.cast.join(", ")}</span>
                </p>
              )}

              {/* HUGE TITLE + play arrow */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 18, marginBottom: 14 }}>
                <h1
                  className="font-display"
                  style={{
                    fontSize: "clamp(58px, 7.8vw, 118px)",
                    fontWeight: 400,
                    lineHeight: 0.88,
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                    color: "#F0ECE3",
                    margin: 0,
                    textShadow: "0 8px 48px rgba(0,0,0,0.8)",
                    flex: 1,
                  }}
                >
                  {data.title}
                </h1>

                {/* Circular play button */}
                <a
                  href={trailerUrl ?? `https://www.themoviedb.org/movie/${data.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  title={trailerUrl ? "Ver tráiler" : "Ver en TMDB"}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                    width: "clamp(42px, 4vw, 58px)",
                    height: "clamp(42px, 4vw, 58px)",
                    borderRadius: "50%",
                    border: "2px solid rgba(240,236,227,0.5)",
                    color: "#F0ECE3",
                    textDecoration: "none",
                    marginBottom: "0.1em",
                    transition: "border-color 0.15s, background 0.15s",
                    background: "rgba(240,236,227,0.05)",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "#F0ECE3";
                    e.currentTarget.style.background = "rgba(240,236,227,0.12)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "rgba(240,236,227,0.5)";
                    e.currentTarget.style.background = "rgba(240,236,227,0.05)";
                  }}
                >
                  <svg width="clamp(14px, 1.4vw, 20px)" height="clamp(14px, 1.4vw, 20px)" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: "2px" }}>
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                </a>
              </div>

              {/* Genres */}
              {data.genres.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0, marginBottom: 20 }}>
                  {data.genres.slice(0, 6).map((g, i) => (
                    <span key={g.id} style={{ display: "flex", alignItems: "center" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(240,236,227,0.38)" }}>
                        {g.name}
                      </span>
                      {i < Math.min(data.genres.length, 6) - 1 && (
                        <span style={{ margin: "0 8px", color: "rgba(240,236,227,0.18)", fontSize: 9 }}>·</span>
                      )}
                    </span>
                  ))}
                </div>
              )}

              {/* Overview */}
              {data.overview && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.38 }}
                >
                  <div style={{ width: "100%", height: 1, marginBottom: 14, background: "linear-gradient(to right, rgba(240,236,227,0.1), transparent 80%)" }} />
                  <p style={{ fontSize: 13, lineHeight: 1.8, color: "rgba(240,236,227,0.42)", margin: 0, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {data.overview}
                  </p>
                </motion.div>
              )}

              {/* Ver en TMDB */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.54 }}
                style={{ marginTop: 16 }}
              >
                <a
                  href={`https://www.themoviedb.org/movie/${data.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "7px 15px", borderRadius: 7,
                    border: "1px solid rgba(201,169,110,0.22)",
                    background: "rgba(201,169,110,0.06)",
                    color: "#C9A96E", fontSize: 11, fontWeight: 700,
                    letterSpacing: "0.07em", textTransform: "uppercase",
                    textDecoration: "none",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(201,169,110,0.14)";
                    e.currentTarget.style.borderColor = "rgba(201,169,110,0.45)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "rgba(201,169,110,0.06)";
                    e.currentTarget.style.borderColor = "rgba(201,169,110,0.22)";
                  }}
                >
                  Ver en TMDB
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
              </motion.div>
            </motion.div>
          </>
        )
      )}
    </div>
  );
}

// ─── Public wrapper — portal into document.body ───────────────────────────────
export default function MovieDetailModal({ movieId, onClose }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {movieId !== null && (
        <motion.div
          key={`modal-${movieId}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          style={{ position: "fixed", inset: 0, zIndex: 9000 }}
        >
          <ModalInner movieId={movieId} onClose={onClose} />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
