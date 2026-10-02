"use client";

import Icon from "@/components/ui/Icon";
import { useWatchlist, type SaveableMovie } from "@/lib/client/watchlist";

type Props = {
  movie: SaveableMovie;
  /** "icon" sits over a poster; "full" is a labelled button. */
  variant?: "icon" | "full";
  className?: string;
};

export default function SaveButton({ movie, variant = "icon", className = "" }: Props) {
  const { sourceOf, toggle } = useWatchlist();
  const source = sourceOf(movie.tmdbId);
  const saved = source !== null;
  // Films from the Letterboxd watchlist are managed on Letterboxd, not here
  const fromLetterboxd = source === "letterboxd";

  const label = fromLetterboxd
    ? `${movie.title} está en tu watchlist de Letterboxd`
    : saved ? `Quitar ${movie.title} de Mi lista` : `Guardar ${movie.title} en Mi lista`;
  const hint = fromLetterboxd ? "En tu watchlist de Letterboxd" : saved ? "Quitar de Mi lista" : "Guardar en Mi lista";

  if (variant === "full") {
    return (
      <button
        onClick={() => toggle(movie)}
        disabled={fromLetterboxd}
        aria-pressed={saved}
        title={fromLetterboxd ? "Se gestiona desde Letterboxd" : undefined}
        className={`btn ${saved ? "border border-butaca-claro/50 bg-butaca/25 text-pantalla hover:bg-butaca/35" : "btn-ghost"} disabled:opacity-100 ${className}`}
      >
        <Icon name={saved ? "bookmark-filled" : "bookmark"} size={16} className={saved ? "text-butaca-claro" : ""} />
        {fromLetterboxd ? "En tu watchlist de Letterboxd" : saved ? "En Mi lista" : "Guardar en Mi lista"}
      </button>
    );
  }

  return (
    <button
      onClick={e => { e.stopPropagation(); toggle(movie); }}
      disabled={fromLetterboxd}
      aria-pressed={saved}
      aria-label={label}
      title={hint}
      className={`grid size-9 place-items-center rounded-full border backdrop-blur-md transition-colors disabled:cursor-default ${
        saved
          ? "border-butaca-claro/60 bg-butaca/80 text-pantalla"
          : "border-linea-fuerte bg-sala/70 text-pantalla hover:bg-sala/90"
      } ${className}`}
    >
      <Icon name={saved ? "bookmark-filled" : "bookmark"} size={16} />
    </button>
  );
}
