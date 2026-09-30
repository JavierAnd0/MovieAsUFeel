"use client";

import Icon from "@/components/ui/Icon";
import { useWatchlist, type SavedMovie } from "@/lib/client/watchlist";

type Props = {
  movie: Omit<SavedMovie, "savedAt">;
  /** "icon" sits over a poster; "full" is a labelled button. */
  variant?: "icon" | "full";
  className?: string;
};

export default function SaveButton({ movie, variant = "icon", className = "" }: Props) {
  const { isSaved, toggle } = useWatchlist();
  const saved = isSaved(movie.tmdbId);
  const label = saved ? `Quitar ${movie.title} de Mi lista` : `Guardar ${movie.title} en Mi lista`;

  if (variant === "full") {
    return (
      <button
        onClick={() => toggle(movie)}
        aria-pressed={saved}
        className={`btn ${saved ? "border border-butaca-claro/50 bg-butaca/25 text-pantalla hover:bg-butaca/35" : "btn-ghost"} ${className}`}
      >
        <Icon name={saved ? "bookmark-filled" : "bookmark"} size={16} className={saved ? "text-butaca-claro" : ""} />
        {saved ? "En Mi lista" : "Guardar en Mi lista"}
      </button>
    );
  }

  return (
    <button
      onClick={e => { e.stopPropagation(); toggle(movie); }}
      aria-pressed={saved}
      aria-label={label}
      title={saved ? "Quitar de Mi lista" : "Guardar en Mi lista"}
      className={`grid size-9 place-items-center rounded-full border backdrop-blur-md transition-colors ${
        saved
          ? "border-butaca-claro/60 bg-butaca/80 text-pantalla"
          : "border-linea-fuerte bg-sala/70 text-pantalla hover:bg-sala/90"
      } ${className}`}
    >
      <Icon name={saved ? "bookmark-filled" : "bookmark"} size={16} />
    </button>
  );
}
