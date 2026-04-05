"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { MOOD_META } from "@/lib/mood/moodMap";
import type { TasteProfile } from "@/types/letterboxd";
import type { MoodCategory } from "@/types/mood";

const ScatteredPosters = dynamic(() => import("@/components/home/ScatteredPosters"), { ssr: false });
import MovieSearch from "@/components/home/MovieSearch";

// ─── Types ───────────────────────────────────────────────────────────────────
type Step = "hero" | "connect" | "mood";

const MOOD_ORDER: MoodCategory[] = [
  "happy", "sad", "anxious", "relaxed",
  "frustrated", "thoughtful", "excited", "tired",
];

const MOOD_COLORS: Record<MoodCategory, { glow: string; border: string; bg: string; accent: string }> = {
  happy:      { glow: "rgba(255,214,10,0.2)",   border: "rgba(255,214,10,0.55)",   bg: "rgba(255,214,10,0.09)",   accent: "#FFD60A" },
  sad:        { glow: "rgba(0,212,255,0.2)",    border: "rgba(0,212,255,0.55)",    bg: "rgba(0,212,255,0.09)",    accent: "#00D4FF" },
  anxious:    { glow: "rgba(255,0,110,0.2)",    border: "rgba(255,0,110,0.55)",    bg: "rgba(255,0,110,0.09)",    accent: "#FF006E" },
  relaxed:    { glow: "rgba(131,56,236,0.2)",   border: "rgba(131,56,236,0.55)",   bg: "rgba(131,56,236,0.09)",   accent: "#8338EC" },
  frustrated: { glow: "rgba(255,80,0,0.2)",     border: "rgba(255,110,0,0.55)",    bg: "rgba(255,80,0,0.09)",     accent: "#FF5500" },
  thoughtful: { glow: "rgba(0,180,216,0.2)",    border: "rgba(0,180,216,0.55)",    bg: "rgba(0,180,216,0.09)",    accent: "#00B4D8" },
  excited:    { glow: "rgba(255,77,155,0.2)",   border: "rgba(255,77,155,0.55)",   bg: "rgba(255,77,155,0.09)",   accent: "#FF4D9B" },
  tired:      { glow: "rgba(148,163,184,0.14)", border: "rgba(148,163,184,0.38)",  bg: "rgba(148,163,184,0.06)",  accent: "#94A3B8" },
};

const LOADING_MESSAGES = [
  "Leyendo tu historial de Letterboxd...",
  "Analizando tus géneros favoritos...",
  "Mapeando tu estado de ánimo...",
  "Buscando películas perfectas para ti...",
  "Casi listo...",
];


// ─── Shared sub-components ────────────────────────────────────────────────────
function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex items-center justify-center flex-shrink-0" style={{
        width: 32, height: 32, borderRadius: 8,
        background: "linear-gradient(135deg, #00d4ff, #8338ec)",
      }}>
        <div style={{ position: "absolute", left: 9, top: 11, width: 14, height: 10, backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 1 }} />
        <div style={{ position: "absolute", left: 9, top: 11, width: 5,  height: 10, backgroundColor: "rgba(0,212,255,0.6)" }} />
        <div style={{ position: "absolute", left: 18, top: 11, width: 5, height: 10, backgroundColor: "rgba(0,212,255,0.6)" }} />
      </div>
      <span style={{ fontWeight: 700, fontSize: 18, color: "white" }}>CineMood</span>
    </div>
  );
}

function NavBar({ onBack, backLabel, right }: { onBack?: () => void; backLabel?: string; right?: React.ReactNode }) {
  return (
    <div className="absolute top-6 left-5 right-5 z-20 flex items-center h-14 px-6" style={{
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 16,
    }}>
      {onBack ? (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ color: "rgba(255,255,255,0.5)", background: "none", border: "none", cursor: "pointer" }}
          onMouseEnter={e => (e.currentTarget.style.color = "white")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>←</span>
          <span>{backLabel ?? "Volver"}</span>
        </button>
      ) : <div className="w-20" />}

      <div className="absolute left-1/2 -translate-x-1/2">
        <Logo />
      </div>

      <div className="ml-auto">{right}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();

  // Navigation
  const [step, setStep]     = useState<Step>("hero");
  const [animKey, setAnimKey] = useState(0);

  // Letterboxd
  const [username,       setUsername]       = useState("");
  const [profile,        setProfile]        = useState<TasteProfile | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError,   setConnectError]   = useState<string | null>(null);

  // Mood
  const [selectedMoods, setSelectedMoods] = useState<MoodCategory[]>([]);
  const [freeText,       setFreeText]       = useState("");

  // Recommendation
  const [loading,    setLoading]    = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [recError,   setRecError]   = useState<string | null>(null);

  // Mobile search overlay
  const [mobileSearch, setMobileSearch] = useState(false);

  // Prevent hydration mismatch for 3D showcase
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!loading) return;
    let idx = 0;
    const iv = setInterval(() => {
      idx = (idx + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[idx]);
    }, 1800);
    return () => clearInterval(iv);
  }, [loading]);

  function goTo(next: Step) {
    setStep(next);
    setAnimKey(k => k + 1);
  }

  async function loadProfile() {
    const trimmed = username.trim();
    if (!trimmed) return;
    setConnectLoading(true);
    setConnectError(null);
    try {
      const res = await fetch(`/api/letterboxd?username=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) { setConnectError(data.error ?? "Error al cargar el perfil"); return; }
      setProfile(data as TasteProfile);
    } catch {
      setConnectError("Error de red. Comprueba tu conexión.");
    } finally {
      setConnectLoading(false);
    }
  }

  async function findMovies() {
    if (!profile || selectedMoods.length === 0) return;
    setLoading(true);
    setRecError(null);
    setLoadingMsg(LOADING_MESSAGES[0]);
    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasteProfile: profile,
          moodInput: { categories: selectedMoods, freeText: freeText.trim() || undefined },
        }),
      });
      const data = await res.json();
      if (!res.ok) { setRecError(data.error ?? "Error al generar recomendaciones"); setLoading(false); return; }
      sessionStorage.setItem("movieasufeel_results", JSON.stringify({ profile, moodCategories: selectedMoods, result: data }));
      router.push("/results");
    } catch {
      setRecError("Error de red. Comprueba tu conexión.");
      setLoading(false);
    }
  }

  function toggleMood(mood: MoodCategory) {
    if (selectedMoods.includes(mood)) {
      setSelectedMoods(selectedMoods.filter(m => m !== mood));
    } else if (selectedMoods.length < 3) {
      setSelectedMoods([...selectedMoods, mood]);
    } else {
      setSelectedMoods([...selectedMoods.slice(1), mood]);
    }
  }

  // ─── Compute dynamic mood glow for mood step ──────────────────────────────
  const moodGlows = selectedMoods.map(m => MOOD_COLORS[m].glow);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="relative bg-[#0C0C12] overflow-hidden" style={{ minHeight: "100dvh" }}>

      {/* ── Global loading overlay ─────────────────────────────────────────── */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5" style={{ background: "rgba(10,10,15,0.96)", backdropFilter: "blur(8px)" }}>
          <div className="text-5xl" style={{ animation: "pulse 2s ease-in-out infinite" }}>🎬</div>
          <div style={{ color: "rgba(0,212,255,0.8)" }}>
            <LoadingSpinner size={36} />
          </div>
          <p className="text-sm text-center max-w-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{loadingMsg}</p>
        </div>
      )}

      <AnimatePresence mode="wait">

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* STEP: HERO                                                          */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {step === "hero" && (
        <motion.section
          key="hero"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(8px)" }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full overflow-hidden bg-[#0C0C12]"
          style={{ height: "100dvh" }}
        >

          {/* Scattered poster background — client-only */}
          {mounted && <ScatteredPosters />}

          {/* Ambient glow — warm, subtle */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(ellipse 90% 80% at 50% 50%, transparent 20%, rgba(12,12,18,0.7) 60%, rgba(12,12,18,0.97) 100%)",
          }} />
          <div className="absolute pointer-events-none pulse-glow" style={{
            left: "20%", top: "15%", width: 600, height: 400,
            background: "radial-gradient(ellipse at center, rgba(201,169,110,0.06) 0%, transparent 70%)",
            filter: "blur(60px)",
          }} />

          {/* Gradient fades */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 65% 70% at 50% 50%, transparent 0%, rgba(12,12,18,0.65) 55%, rgba(12,12,18,0.95) 100%)" }} />
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: 300, background: "linear-gradient(to top, #0C0C12 15%, transparent 100%)" }} />
          <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ height: 160, background: "linear-gradient(to bottom, #0C0C12 5%, transparent 100%)" }} />

          {/* Navbar */}
          <nav className="absolute top-6 left-5 right-5 z-20 flex items-center h-14 px-4 sm:px-6 gap-4" style={{ background: "rgba(240,236,227,0.04)", border: "1px solid rgba(240,236,227,0.08)", borderRadius: 16 }}>
            <Logo />

            {/* Desktop search — hidden on mobile */}
            <div className="hidden sm:flex flex-1 justify-center px-4" style={{ maxWidth: 460, margin: "0 auto" }}>
              <div style={{ width: "100%" }}>
                <MovieSearch />
              </div>
            </div>

            {/* Desktop nav buttons — hidden on mobile */}
            <div className="hidden sm:flex items-center flex-shrink-0" style={{ gap: 20 }}>
              <button onClick={() => goTo("hero")} style={{ height: 34, padding: "0 14px", borderRadius: 8, background: "rgba(240,236,227,0.08)", fontWeight: 500, fontSize: 13, color: "#F0ECE3", border: "1px solid rgba(240,236,227,0.12)", cursor: "pointer", whiteSpace: "nowrap" }}>
                Inicio
              </button>
              <button onClick={() => goTo("connect")} style={{ fontWeight: 500, fontSize: 13, color: "rgba(240,236,227,0.45)", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
                Mood
              </button>
            </div>

            {/* Mobile nav — search icon + CTA */}
            <div className="flex sm:hidden items-center gap-2 ml-auto">
              <button
                onClick={() => setMobileSearch(true)}
                aria-label="Buscar película"
                style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(240,236,227,0.08)", border: "1px solid rgba(240,236,227,0.12)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#F0ECE3", flexShrink: 0 }}
              >
                🔍
              </button>
              <button
                onClick={() => goTo("connect")}
                style={{ height: 36, padding: "0 14px", borderRadius: 8, background: "linear-gradient(135deg, #C9A96E, #A07840)", fontWeight: 700, fontSize: 13, color: "#0C0C12", border: "none", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
              >
                Empezar
              </button>
            </div>
          </nav>

          {/* Mobile search overlay */}
          {mobileSearch && (
            <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(12,12,18,0.97)", backdropFilter: "blur(10px)" }}>
              <div className="flex items-center gap-3 px-5 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex-1">
                  <MovieSearch />
                </div>
                <button
                  onClick={() => setMobileSearch(false)}
                  style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "rgba(255,255,255,0.6)", flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>Busca cualquier película</p>
              </div>
            </div>
          )}

          {/* Hero content */}
          <div className="relative z-10 flex flex-col items-center justify-center h-full" style={{ paddingTop: 80, paddingBottom: 80 }}>
            {/* Badge */}
            <div className="flex items-center gap-2" style={{ padding: "8px 16px", background: "rgba(201,169,110,0.08)", border: "1px solid rgba(201,169,110,0.2)", borderRadius: 100, marginBottom: 36 }}>
              <motion.span
                animate={{ scale: [1, 1.45, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                style={{ width: 6, height: 6, borderRadius: "50%", background: "#C9A96E", display: "inline-block", flexShrink: 0 }}
              />
              <span style={{ fontSize: 12, color: "rgba(240,236,227,0.65)", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>Películas para tu estado de ánimo</span>
            </div>
            {/* Title */}
            <h1 className="font-display" style={{
              fontWeight: 400,
              fontSize: "clamp(72px, 11vw, 150px)",
              lineHeight: 0.9,
              letterSpacing: "2px",
              color: "#F0ECE3",
              textAlign: "center",
              textTransform: "uppercase",
              marginBottom: 24,
              filter: "drop-shadow(0 0 80px rgba(201,169,110,0.15))",
            }}>
              Movies as<br />you feel
            </h1>
            {/* Subtitle */}
            <p style={{ fontWeight: 400, fontSize: "clamp(15px, 1.8vw, 18px)", color: "rgba(240,236,227,0.5)", textAlign: "center", marginBottom: 40, maxWidth: 420, lineHeight: 1.6 }}>
              Conecta Letterboxd · selecciona tu estado de ánimo · descubre tu próxima película favorita
            </p>
            {/* CTA with shimmer */}
            <motion.button
              onClick={() => goTo("connect")}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 380, damping: 22 }}
              className="relative overflow-hidden"
              style={{
                width: "min(240px, 100%)", height: 52,
                background: "linear-gradient(135deg, #C9A96E, #A07840)",
                borderRadius: 12, border: "none", cursor: "pointer",
                fontWeight: 700, fontSize: 14, color: "#0C0C12",
                boxShadow: "0 0 40px rgba(201,169,110,0.25)",
                letterSpacing: "0.02em",
              }}
            >
              <motion.span
                className="pointer-events-none absolute inset-0"
                style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.25) 50%, transparent 60%)" }}
                animate={{ x: ["-100%", "200%"] }}
                transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut", repeatDelay: 1.4 }}
              />
              Conectar Letterboxd
            </motion.button>
          </div>

        </motion.section>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* STEP: CONNECT — Letterboxd                                          */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {step === "connect" && (
        <motion.div
          key="connect"
          initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex flex-col"
          style={{ minHeight: "100dvh" }}
        >

          {/* Glow blobs */}
          <div className="fixed pointer-events-none" style={{ left: -100, top: -100, width: 600, height: 600, background: "radial-gradient(ellipse at center, rgba(201,169,110,0.1) 0%, rgba(201,169,110,0.05) 40%, transparent 70%)", filter: "blur(80px)", zIndex: 0 }} />
          <div className="fixed pointer-events-none" style={{ right: -150, bottom: -100, width: 500, height: 500, background: "radial-gradient(ellipse at center, rgba(201,169,110,0.08) 0%, transparent 70%)", filter: "blur(60px)", zIndex: 0 }} />

          {/* Navbar */}
          <NavBar
            onBack={() => goTo("hero")}
            backLabel="Inicio"
            right={
              <div className="flex items-center gap-1.5">
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "linear-gradient(135deg, #00d4ff, #8338ec)" }} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>Paso 1 de 2</span>
              </div>
            }
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-4 pt-28 pb-12">
            <div className="w-full" style={{ maxWidth: 480 }}>

              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="flex items-center justify-center" style={{
                  width: 72, height: 72, borderRadius: 20,
                  background: "linear-gradient(135deg, rgba(0,212,255,0.15), rgba(131,56,236,0.15))",
                  border: "1px solid rgba(255,255,255,0.1)",
                  fontSize: 32,
                }}>
                  🎬
                </div>
              </div>

              {/* Title */}
              <h1 className="font-display text-center" style={{ fontWeight: 400, fontSize: "clamp(48px, 6vw, 80px)", color: "white", lineHeight: 0.92, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 16 }}>
                Conecta tu{" "}
                <span style={{ background: "linear-gradient(to right, #00d4ff, #8338ec)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  Letterboxd
                </span>
              </h1>
              <p className="text-center" style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", marginBottom: 40, lineHeight: 1.6 }}>
                Analizamos tu historial de películas para encontrar recomendaciones únicas basadas en tu gusto real.
              </p>

              {/* Input card */}
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 24 }}>

                {/* URL input row */}
                <div className="flex gap-2" style={{ marginBottom: connectError || profile ? 16 : 0 }}>
                  <div className="relative flex-1">
                    <span className="absolute top-1/2 -translate-y-1/2 text-sm pointer-events-none select-none" style={{ left: 14, color: "rgba(255,255,255,0.25)" }}>
                      letterboxd.com/
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={e => { setUsername(e.target.value); setProfile(null); setConnectError(null); }}
                      onKeyDown={e => e.key === "Enter" && !connectLoading && loadProfile()}
                      placeholder="tu_usuario"
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full text-sm text-white rounded-xl py-3 pr-3 focus:outline-none transition-all duration-200"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        paddingLeft: "8.5rem",
                      }}
                      onFocus={e => { e.currentTarget.style.border = "1px solid rgba(0,212,255,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,212,255,0.08)"; }}
                      onBlur={e => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                    />
                  </div>
                  <button
                    onClick={loadProfile}
                    disabled={connectLoading || !username.trim()}
                    className="flex items-center gap-2 rounded-xl px-4 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #C9A96E, #A07840)", color: "#0C0C12", border: "none", cursor: "pointer", height: 46 }}
                  >
                    {connectLoading && <LoadingSpinner size={15} />}
                    {connectLoading ? "Cargando..." : "Cargar"}
                  </button>
                </div>

                {/* Error */}
                {connectError && (
                  <div className="rounded-xl px-4 py-3 text-sm" style={{ border: "1px solid rgba(255,0,110,0.3)", background: "rgba(255,0,110,0.07)", color: "rgba(255,120,160,0.9)" }}>
                    {connectError}
                  </div>
                )}

                {/* Profile card */}
                {profile && !connectLoading && (
                  <div className="rounded-xl px-4 py-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,169,110,0.25)" }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center justify-center rounded-full font-bold text-sm" style={{ width: 40, height: 40, background: "linear-gradient(135deg, #C9A96E, #A07840)", color: "#0C0C12", flexShrink: 0 }}>
                        {profile.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: "#C9A96E" }}>@{profile.username}</p>
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                          {profile.filmCount} películas · ⭐ {profile.avgRating.toFixed(1)}
                        </p>
                      </div>
                      <div className="ml-auto">
                        <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: "rgba(201,169,110,0.1)", color: "#C9A96E", border: "1px solid rgba(201,169,110,0.2)" }}>
                          ✓ Conectado
                        </span>
                      </div>
                    </div>
                    {profile.topGenres.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {profile.topGenres.slice(0, 5).map(g => (
                          <span key={g.id} className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ background: "rgba(131,56,236,0.12)", color: "rgba(131,56,236,0.9)", border: "1px solid rgba(131,56,236,0.2)" }}>
                            {g.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Continue CTA */}
              <div style={{ marginTop: 16, opacity: profile ? 1 : 0, transform: profile ? "translateY(0)" : "translateY(8px)", transition: "opacity 0.3s ease, transform 0.3s ease", pointerEvents: profile ? "auto" : "none" }}>
                <button
                  onClick={() => goTo("mood")}
                  className="w-full font-bold text-sm rounded-xl transition-all"
                  style={{ height: 52, background: "linear-gradient(135deg, #C9A96E, #A07840)", color: "#0C0C12", border: "none", cursor: "pointer", boxShadow: "0 0 30px rgba(201,169,110,0.25)" }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 50px rgba(201,169,110,0.4)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 30px rgba(201,169,110,0.25)"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  Continuar → Seleccionar mood
                </button>
              </div>

              <p className="text-center text-xs mt-4" style={{ color: "rgba(255,255,255,0.2)" }}>
                Tu perfil debe ser público en Letterboxd
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* STEP: MOOD SELECTOR                                                 */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {step === "mood" && (
        <motion.div
          key="mood"
          initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex flex-col"
          style={{ minHeight: "100dvh" }}
        >

          {/* Dynamic glow based on selected moods */}
          {selectedMoods.length === 0 ? (
            <div className="fixed pointer-events-none" style={{ left: "50%", top: "30%", transform: "translate(-50%,-50%)", width: 700, height: 500, background: "radial-gradient(ellipse at center, rgba(131,56,236,0.15) 0%, transparent 65%)", filter: "blur(80px)", zIndex: 0 }} />
          ) : selectedMoods.map((m, i) => (
            <div key={m} className="fixed pointer-events-none transition-all duration-700" style={{
              left: `${20 + i * 30}%`, top: `${20 + i * 15}%`,
              width: 500, height: 400,
              background: `radial-gradient(ellipse at center, ${MOOD_COLORS[m].glow} 0%, transparent 65%)`,
              filter: "blur(70px)",
              zIndex: 0,
            }} />
          ))}

          {/* Navbar */}
          <NavBar
            onBack={() => goTo("connect")}
            backLabel="Conectar"
            right={
              <div className="flex items-center gap-1.5">
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "linear-gradient(135deg, #8338ec, #ff006e)" }} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>Paso 2 de 2</span>
              </div>
            }
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center flex-1 px-4 pt-28 pb-12">
            <div className="w-full" style={{ maxWidth: 760 }}>

              {/* Header */}
              <div className="text-center mb-10">
                <h1 className="font-display" style={{ fontWeight: 400, fontSize: "clamp(48px, 6vw, 80px)", color: "white", lineHeight: 0.92, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>
                  ¿Cómo te{" "}
                  <span style={{ background: "linear-gradient(to right, #8338ec, #ff006e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                    sientes
                  </span>{" "}
                  hoy?
                </h1>
                <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)" }}>
                  Selecciona hasta 3 estados de ánimo · {selectedMoods.length > 0 ? `${selectedMoods.length} seleccionado${selectedMoods.length > 1 ? "s" : ""}` : "ninguno seleccionado"}
                </p>
              </div>

              {/* Mood grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                {MOOD_ORDER.map(mood => {
                  const meta    = MOOD_META[mood];
                  const colors  = MOOD_COLORS[mood];
                  const selected = selectedMoods.includes(mood);
                  const disabled = !selected && selectedMoods.length >= 3;

                  return (
                    <button
                      key={mood}
                      onClick={() => toggleMood(mood)}
                      disabled={disabled}
                      className="flex flex-col items-center justify-center gap-2 rounded-2xl transition-all duration-200"
                      style={{
                        padding: "20px 12px",
                        background: selected ? colors.bg : "rgba(255,255,255,0.03)",
                        border: selected ? `1px solid ${colors.border}` : "1px solid rgba(255,255,255,0.08)",
                        boxShadow: selected ? `0 0 24px ${colors.glow}, inset 0 0 20px ${colors.bg}` : "none",
                        opacity: disabled ? 0.3 : 1,
                        cursor: disabled ? "not-allowed" : "pointer",
                        transform: selected ? "scale(1.03)" : "scale(1)",
                      }}
                      onMouseEnter={e => { if (!disabled && !selected) { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.border = "1px solid rgba(255,255,255,0.15)"; e.currentTarget.style.transform = "scale(1.02)"; }}}
                      onMouseLeave={e => { if (!selected) { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"; e.currentTarget.style.transform = "scale(1)"; }}}
                    >
                      <span style={{ fontSize: 42, lineHeight: 1 }}>{meta.emoji}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: selected ? colors.accent : "rgba(255,255,255,0.8)", transition: "color 0.2s" }}>
                        {meta.label}
                      </span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textAlign: "center", lineHeight: 1.3 }}>
                        {meta.description}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Optional free text */}
              <div style={{ marginBottom: 20 }}>
                <label className="block text-sm mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                  ¿Algo más específico? <span style={{ color: "rgba(255,255,255,0.2)" }}>(opcional)</span>
                </label>
                <textarea
                  rows={2}
                  value={freeText}
                  onChange={e => setFreeText(e.target.value)}
                  placeholder='Ej: "algo gracioso pero no infantil, no muy larga…"'
                  className="w-full resize-none rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  onFocus={e => { e.currentTarget.style.border = "1px solid rgba(131,56,236,0.4)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(131,56,236,0.08)"; }}
                  onBlur={e => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>

              {/* Error */}
              {recError && (
                <div className="rounded-xl px-4 py-3 text-sm mb-4" style={{ border: "1px solid rgba(255,0,110,0.3)", background: "rgba(255,0,110,0.07)", color: "rgba(255,120,160,0.9)" }}>
                  {recError}
                </div>
              )}

              {/* CTA */}
              <button
                onClick={findMovies}
                disabled={selectedMoods.length === 0 || loading}
                className="w-full font-bold text-sm rounded-xl transition-all disabled:opacity-35 disabled:cursor-not-allowed"
                style={{
                  height: 56,
                  background: selectedMoods.length > 0
                    ? "linear-gradient(135deg, #C9A96E, #A07840)"
                    : "rgba(255,255,255,0.06)",
                  color: selectedMoods.length > 0 ? "#0C0C12" : "rgba(255,255,255,0.3)",
                  border: "none",
                  cursor: selectedMoods.length === 0 ? "not-allowed" : "pointer",
                  boxShadow: selectedMoods.length > 0 ? "0 0 30px rgba(201,169,110,0.3)" : "none",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={e => { if (selectedMoods.length > 0) { e.currentTarget.style.boxShadow = "0 0 50px rgba(201,169,110,0.45)"; e.currentTarget.style.transform = "translateY(-1px)"; }}}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = selectedMoods.length > 0 ? "0 0 30px rgba(201,169,110,0.3)" : "none"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                {selectedMoods.length > 0
                  ? `${selectedMoods.map(m => MOOD_META[m].emoji).join(" ")}  Encontrar mis películas`
                  : "Selecciona al menos un estado de ánimo"}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      </AnimatePresence>
    </div>
  );
}
