"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import MoodCard from "@/components/onboarding/MoodCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { MOOD_META } from "@/lib/mood/moodMap";
import type { TasteProfile } from "@/types/letterboxd";
import type { MoodCategory } from "@/types/mood";

const MOOD_ORDER: MoodCategory[] = [
  "excited", "sad", "thoughtful", "anxious",
  "happy", "frustrated", "relaxed", "tired",
];

const LOADING_MESSAGES = [
  "Reading your Letterboxd...",
  "Analyzing your taste profile...",
  "Mapping your mood...",
  "Discovering your next film...",
  "Almost there...",
];

export default function HomePage() {
  const router = useRouter();

  // Letterboxd state
  const [username, setUsername] = useState("");
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Mood state
  const [selectedMoods, setSelectedMoods] = useState<MoodCategory[]>([]);
  const [freeText, setFreeText] = useState("");
  const [showTextarea, setShowTextarea] = useState(false);

  // Recommendations loading
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) return;
    let idx = 0;
    const t = setInterval(() => { idx = (idx + 1) % LOADING_MESSAGES.length; setLoadingMsg(LOADING_MESSAGES[idx]); }, 1800);
    return () => clearInterval(t);
  }, [loading]);

  async function connectLetterboxd() {
    const trimmed = username.trim();
    if (!trimmed) return;
    setProfileLoading(true);
    setProfileError(null);
    try {
      const res = await fetch(`/api/letterboxd?username=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) { setProfileError(data.error ?? "Error loading profile"); return; }
      setProfile(data as TasteProfile);
    } catch { setProfileError("Network error. Please try again."); }
    finally { setProfileLoading(false); }
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

  async function findMovies() {
    if (!profile || selectedMoods.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasteProfile: profile, moodInput: { categories: selectedMoods, freeText: freeText.trim() || undefined } }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error generating recommendations"); return; }
      sessionStorage.setItem("movieasufeel_results", JSON.stringify({ profile, moodCategories: selectedMoods, result: data }));
      router.push("/results");
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <>
      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6" style={{ background: "rgba(10,10,10,0.97)", backdropFilter: "blur(8px)" }}>
          <div className="font-display text-2xl tracking-widest" style={{ color: "var(--accent)" }}>CINEMOOD</div>
          <LoadingSpinner size={32} />
          <p className="text-sm tracking-widest uppercase" style={{ color: "var(--text-2)" }}>{loadingMsg}</p>
        </div>
      )}

      <Navbar />

      {/* ── HERO ────────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
        {/* Background: scattered film stills */}
        <HeroBackground />
        {/* Dark overlay so text is readable */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.7) 50%, #0a0a0a 100%)" }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <h1 className="font-display leading-none mb-1" style={{ fontSize: "clamp(3.5rem, 10vw, 7rem)" }}>
            SYNC YOUR
          </h1>
          <h1 className="font-display leading-none mb-6" style={{ fontSize: "clamp(3.5rem, 10vw, 7rem)", color: "var(--accent)" }}>
            CINEMA SOUL
          </h1>
          <p className="text-sm mb-10 max-w-sm" style={{ color: "var(--text-2)", lineHeight: 1.7 }}>
            Connect your Letterboxd and let the Digital Projectionist curate your next emotional journey.
          </p>

          {/* Connect input */}
          <div className="flex w-full max-w-sm overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <div className="flex flex-1 items-center pl-4 gap-2">
              {/* Letterboxd-ish icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0" style={{ color: "var(--text-3)" }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !profileLoading && connectLetterboxd()}
                placeholder="Your Letterboxd username"
                className="flex-1 bg-transparent py-3 text-sm text-white placeholder-gray-600 outline-none"
              />
            </div>
            <button
              onClick={connectLetterboxd}
              disabled={!username.trim() || profileLoading}
              className="flex items-center gap-2 rounded-full m-1 px-5 py-2.5 text-sm font-bold tracking-wider uppercase transition-all disabled:opacity-40"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              {profileLoading ? <LoadingSpinner size={14} /> : null}
              {profileLoading ? "..." : "Connect →"}
            </button>
          </div>

          {profileError && (
            <div className="mt-3 w-full max-w-sm">
              <ErrorMessage message={profileError} />
            </div>
          )}

          {/* Profile preview after connect */}
          {profile && !profileLoading && (
            <div className="mt-4 flex items-center gap-3 rounded-full px-4 py-2 text-xs" style={{ background: "rgba(255,107,0,0.1)", border: "1px solid rgba(255,107,0,0.3)" }}>
              <span className="font-semibold" style={{ color: "var(--accent)" }}>✓ @{profile.username}</span>
              <span style={{ color: "var(--text-3)" }}>·</span>
              <span style={{ color: "var(--text-2)" }}>{profile.filmCount} films</span>
              <span style={{ color: "var(--text-3)" }}>·</span>
              <span style={{ color: "var(--text-2)" }}>⭐ {profile.avgRating}</span>
              {profile.topGenres[0] && (
                <><span style={{ color: "var(--text-3)" }}>·</span>
                <span style={{ color: "var(--text-2)" }}>{profile.topGenres.slice(0,2).map(g=>g.name).join(", ")}</span></>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── MOOD SELECTION ──────────────────────────────── */}
      <section className="px-6 pb-20" style={{ background: "#0a0a0a" }}>
        <div className="mx-auto max-w-5xl">
          {/* Section header */}
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="label-tag mb-2">Curation Engine</p>
              <h2 className="font-display text-4xl">How do you feel?</h2>
            </div>
            <div className="flex items-center gap-2" style={{ color: "var(--text-3)" }}>
              {/* Share icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/>
              </svg>
            </div>
          </div>

          {/* Mood card grid */}
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {MOOD_ORDER.map(mood => (
              <MoodCard
                key={mood}
                mood={mood}
                selected={selectedMoods.includes(mood)}
                disabled={selectedMoods.length >= 3}
                onClick={() => toggleMood(mood)}
              />
            ))}
          </div>

          {/* Optional text + CTA */}
          <div className="mt-6 flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => setShowTextarea(!showTextarea)}
              className="text-xs tracking-wider uppercase transition-colors"
              style={{ color: showTextarea ? "var(--accent)" : "var(--text-3)" }}
            >
              + Refine with words
            </button>

            {showTextarea && (
              <textarea
                rows={2}
                value={freeText}
                onChange={e => setFreeText(e.target.value)}
                placeholder='e.g. "something short and classic, not too intense"'
                className="w-full max-w-md resize-none rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-1)" }}
              />
            )}

            {error && <div className="w-full max-w-md"><ErrorMessage message={error} /></div>}

            <button
              type="button"
              onClick={findMovies}
              disabled={!profile || selectedMoods.length === 0 || loading}
              className="rounded-full px-10 py-3 text-sm font-bold tracking-widest uppercase transition-all disabled:opacity-30"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              {selectedMoods.length > 0
                ? `${selectedMoods.map(m => MOOD_META[m].emoji).join(" ")} Curate My Session`
                : "Select a Mood First"}
            </button>

            {!profile && selectedMoods.length > 0 && (
              <p className="text-xs" style={{ color: "var(--text-3)" }}>Connect your Letterboxd above first</p>
            )}
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer className="border-t py-10 text-center" style={{ borderColor: "var(--border)" }}>
        <p className="font-display text-lg tracking-widest mb-4" style={{ color: "var(--text-2)" }}>CineMood</p>
        <div className="flex justify-center gap-6 mb-4">
          {["Letterboxd", "Instagram", "Twitter", "Privacy", "Terms"].map(l => (
            <a key={l} href="#" className="text-xs tracking-widest uppercase transition-colors hover:text-white" style={{ color: "var(--text-3)" }}>{l}</a>
          ))}
        </div>
        <p className="text-xs" style={{ color: "var(--text-3)" }}>© 2025 CINEMOOD. THE DIGITAL PROJECTIONIST.</p>
      </footer>
    </>
  );
}

// ── Hero background: scattered polaroid-style film stills ────────────────────
function HeroBackground() {
  const cards = [
    { top: "18%", left: "8%",  rotate: "-12deg", w: 120, h: 160, gradient: "linear-gradient(135deg, #1a0800 0%, #3d1200 50%, #0a0500 100%)" },
    { top: "12%", left: "22%", rotate: "6deg",   w: 140, h: 180, gradient: "linear-gradient(135deg, #0a1a0a 0%, #1a3d1a 50%, #050a05 100%)" },
    { top: "25%", right: "8%", rotate: "10deg",  w: 130, h: 170, gradient: "linear-gradient(135deg, #0a0a1a 0%, #1a1a3d 50%, #050508 100%)" },
    { top: "8%",  right: "22%",rotate: "-7deg",  w: 115, h: 155, gradient: "linear-gradient(135deg, #1a1000 0%, #3d2800 50%, #0a0800 100%)" },
    { top: "55%", left: "5%",  rotate: "15deg",  w: 100, h: 135, gradient: "linear-gradient(135deg, #1a0a0a 0%, #3d1a1a 50%, #0a0505 100%)" },
    { top: "50%", right: "5%", rotate: "-14deg", w: 110, h: 148, gradient: "linear-gradient(135deg, #0a1a1a 0%, #1a3d3d 50%, #050a0a 100%)" },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 60%, rgba(255,107,0,0.08) 0%, transparent 70%)" }} />
      {cards.map((c, i) => (
        <div
          key={i}
          className="absolute rounded-sm overflow-hidden"
          style={{
            top: c.top, left: (c as any).left, right: (c as any).right,
            width: c.w, height: c.h,
            background: c.gradient,
            transform: `rotate(${c.rotate})`,
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
          }}
        >
          {/* Polaroid bottom strip */}
          <div className="absolute bottom-0 left-0 right-0 h-8" style={{ background: "rgba(0,0,0,0.5)" }} />
        </div>
      ))}
    </div>
  );
}
