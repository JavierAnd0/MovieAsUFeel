"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MovieDetailModal from "./MovieDetailModal";

type SearchResult = {
  id: number;
  title: string;
  year: string;
  posterPath: string | null;
};

export default function MovieSearch() {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<SearchResult[]>([]);
  const [loading, setLoading]   = useState(false);
  const [open, setOpen]         = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.trim().length < 2) { setResults([]); setOpen(false); return; }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(result: SearchResult) {
    setSelectedId(result.id);
    setQuery("");
    setOpen(false);
  }

  return (
    <>
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      {/* Input — compact for navbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 12px",
          height: 42,
          minHeight: 42,
          background: "rgba(240,236,227,0.05)",
          border: open || query ? "1px solid rgba(201,169,110,0.4)" : "1px solid rgba(240,236,227,0.1)",
          borderRadius: open && results.length > 0 ? "10px 10px 0 0" : 10,
          transition: "border-color 0.2s, border-radius 0.15s",
        }}
      >
        {/* Search icon */}
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(240,236,227,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Buscar una película..."
          autoComplete="off"
          spellCheck={false}
          style={{
            flex: 1,
            background: "none",
            border: "none",
            outline: "none",
            fontSize: 13,
            color: "#F0ECE3",
            fontFamily: "inherit",
          }}
        />

        {loading && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(201,169,110,0.7)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, animation: "spin 0.8s linear infinite" }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        )}

        {query && !loading && (
          <button
            onClick={() => { setQuery(""); setResults([]); setOpen(false); inputRef.current?.focus(); }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "rgba(240,236,227,0.3)", fontSize: 18, lineHeight: 1, flexShrink: 0 }}
          >
            ×
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "#17151E",
              border: "1px solid rgba(201,169,110,0.3)",
              borderTop: "1px solid rgba(201,169,110,0.12)",
              borderRadius: "0 0 10px 10px",
              overflow: "hidden",
              zIndex: 200,
              boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
            }}
          >
            {results.map((r, i) => (
              <button
                key={r.id}
                onClick={() => handleSelect(r)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "10px 16px",
                  background: "none",
                  border: "none",
                  borderBottom: i < results.length - 1 ? "1px solid rgba(240,236,227,0.05)" : "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(201,169,110,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
              >
                {/* Poster thumb */}
                <div style={{ width: 32, height: 48, borderRadius: 6, overflow: "hidden", flexShrink: 0, background: "#2a2535" }}>
                  {r.posterPath && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`https://image.tmdb.org/t/p/w92${r.posterPath}`}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#F0ECE3", marginBottom: 2 }}>
                    {r.title}
                  </div>
                  {r.year && (
                    <div style={{ fontSize: 12, color: "rgba(240,236,227,0.35)" }}>{r.year}</div>
                  )}
                </div>
                <div style={{ marginLeft: "auto", fontSize: 12, color: "rgba(201,169,110,0.5)", flexShrink: 0 }}>
                  Ver →
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    {/* ── Movie detail modal — position:fixed, covers full screen ──── */}
    <MovieDetailModal
      movieId={selectedId}
      onClose={() => setSelectedId(null)}
    />
    </>
  );
}
