"use client";

import { useState } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Badge from "@/components/ui/Badge";
import type { TasteProfile } from "@/types/letterboxd";

type Props = {
  profile: TasteProfile | null;
  onProfileLoaded: (profile: TasteProfile) => void;
};

export default function UsernameInput({ profile, onProfileLoaded }: Props) {
  const [username, setUsername] = useState(profile?.username ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadProfile() {
    const trimmed = username.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/letterboxd?username=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al cargar el perfil");
        return;
      }
      onProfileLoaded(data as TasteProfile);
    } catch {
      setError("Error de red. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm select-none pointer-events-none"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            letterboxd.com/
          </span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && loadProfile()}
            placeholder="tu_usuario"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-xl py-2.5 pr-3 pl-[7.5rem] text-sm text-white placeholder-white/20 focus:outline-none transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(0,212,255,0.4)"; }}
            onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)"; }}
          />
        </div>
        <button
          type="button"
          onClick={loadProfile}
          disabled={loading || !username.trim()}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-[#0a0a0f] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(to right, #00d4ff, #8338ec)" }}
        >
          {loading ? <LoadingSpinner size={16} /> : null}
          {loading ? "Cargando..." : "Cargar perfil"}
        </button>
      </div>

      {error && <ErrorMessage message={error} />}

      {profile && !loading && (
        <div className="rounded-xl px-4 py-3" style={{
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.04)",
        }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-white">@{profile.username}</span>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
              <span style={{ color: "rgba(255,255,255,0.5)" }}>{profile.filmCount} películas</span>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
              <span style={{ color: "rgba(255,214,10,0.8)" }}>★ {profile.avgRating.toFixed(1)}</span>
            </div>
          </div>
          {profile.topGenres.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {profile.topGenres.slice(0, 4).map((g) => (
                <Badge key={g.id} variant="accent">
                  {g.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
