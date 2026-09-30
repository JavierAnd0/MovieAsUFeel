"use client";

import NavBar from "@/components/ui/NavBar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Icon from "@/components/ui/Icon";
import StepIndicator from "./StepIndicator";
import type { TasteProfile } from "@/types/letterboxd";

type Props = {
  username: string;
  onUsernameChange: (value: string) => void;
  profile: TasteProfile | null;
  loading: boolean;
  error: string | null;
  onLoad: () => void;
  onBack: () => void;
  onNext: () => void;
};

export default function ConnectStep({ username, onUsernameChange, profile, loading, error, onLoad, onBack, onNext }: Props) {
  return (
    <div className="relative flex min-h-dvh flex-col px-4 pt-4 sm:px-6 sm:pt-6">
      <div className="light-spill" style={{ left: -160, top: -160, width: 620, height: 620, background: "rgba(207,164,94,0.10)" }} />

      <NavBar onBack={onBack} backLabel="Inicio" right={<StepIndicator current={1} total={2} />} />

      <div className="relative z-10 mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 py-12 md:grid-cols-[1.1fr_1fr] md:gap-16">
        <div>
          <h1 className="font-display text-pantalla" style={{ fontSize: "clamp(52px, 7vw, 96px)" }}>
            Primero,<br />tu historial
          </h1>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-humo">
            Leemos las últimas películas de tu diario de Letterboxd para saber qué géneros te gustan y cómo puntúas. Así no te recomendamos lo que ya has visto.
          </p>
        </div>

        <div>
          <form
            className="panel p-5 sm:p-6"
            onSubmit={e => { e.preventDefault(); if (!loading) onLoad(); }}
          >
            <label htmlFor="lb-user" className="mb-2 block text-sm font-medium text-pantalla">
              Tu usuario de Letterboxd
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 select-none text-sm text-humo/70">
                  letterboxd.com/
                </span>
                <input
                  id="lb-user"
                  type="text"
                  value={username}
                  onChange={e => onUsernameChange(e.target.value)}
                  placeholder="usuario"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="field h-12 pl-[7.45rem] pr-3"
                  aria-invalid={!!error}
                  aria-describedby={error ? "lb-error" : "lb-hint"}
                />
              </div>
              <button type="submit" disabled={loading || !username.trim()} className="btn btn-ghost">
                {loading && <LoadingSpinner size={15} />}
                {loading ? "Leyendo diario" : "Cargar perfil"}
              </button>
            </div>

            {!error && !profile && (
              <p id="lb-hint" className="mt-3 text-xs text-humo">El perfil tiene que ser público.</p>
            )}

            {error && <p id="lb-error" role="alert" className="alert mt-4">{error}</p>}

            {profile && !loading && (
              <div className="mt-4 rounded-xl border border-laton/30 bg-laton/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-laton font-semibold text-sala">
                    {profile.username[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-laton">@{profile.username}</p>
                    <p className="text-xs text-humo">
                      {profile.filmCount} películas en el diario, nota media {profile.avgRating.toFixed(1)}
                    </p>
                  </div>
                  <Icon name="check" size={18} className="ml-auto shrink-0 text-laton" />
                </div>
                {profile.topGenres.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {profile.topGenres.filter(g => g.score > 0).slice(0, 5).map(g => (
                      <span key={g.id} className="chip">{g.name}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </form>

          <button
            onClick={onNext}
            disabled={!profile || loading}
            className={`btn btn-primary mt-4 h-13 w-full text-[15px] transition-opacity ${profile ? "" : "invisible"}`}
          >
            Elegir mi estado de ánimo
          </button>
        </div>
      </div>
    </div>
  );
}
