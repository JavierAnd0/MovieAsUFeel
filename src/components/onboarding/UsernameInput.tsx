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
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 select-none">
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
            className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2.5 pr-3 pl-[7.5rem] text-sm text-gray-200 placeholder-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <button
          type="button"
          onClick={loadProfile}
          disabled={loading || !username.trim()}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? <LoadingSpinner size={16} /> : null}
          {loading ? "Cargando..." : "Cargar perfil"}
        </button>
      </div>

      {error && <ErrorMessage message={error} />}

      {profile && !loading && (
        <div className="rounded-lg border border-gray-700/60 bg-gray-800/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-200">@{profile.username}</span>
              <span className="text-xs text-gray-500">·</span>
              <span className="text-xs text-gray-400">{profile.filmCount} películas</span>
              <span className="text-xs text-gray-500">·</span>
              <span className="text-xs text-gray-400">⭐ {profile.avgRating.toFixed(1)}</span>
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
