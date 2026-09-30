"use client";

export type SortKey = "match" | "rating" | "year";

type Props = {
  genres: string[];
  activeGenre: string | null;
  onGenreChange: (genre: string | null) => void;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  seenCount: number;
  showSeen: boolean;
  onShowSeenChange: (value: boolean) => void;
};

const SORT_LABELS: Record<SortKey, string> = {
  match: "Más afines",
  rating: "Mejor valoradas",
  year: "Más recientes",
};

export default function ResultsToolbar({
  genres, activeGenre, onGenreChange, sort, onSortChange, seenCount, showSeen, onShowSeenChange,
}: Props) {
  return (
    <div className="flex flex-col gap-4 border-y border-linea py-4 md:flex-row md:items-center">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Filtrar por género">
        <button className="chip" aria-pressed={activeGenre === null} onClick={() => onGenreChange(null)}>
          Todos los géneros
        </button>
        {genres.map(g => (
          <button key={g} className="chip" aria-pressed={activeGenre === g} onClick={() => onGenreChange(activeGenre === g ? null : g)}>
            {g}
          </button>
        ))}
      </div>

      <div className="flex shrink-0 items-center gap-4 md:ml-auto">
        {seenCount > 0 && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-humo hover:text-pantalla">
            <input
              type="checkbox"
              checked={showSeen}
              onChange={e => onShowSeenChange(e.target.checked)}
              className="size-4 accent-[var(--color-laton)]"
            />
            Incluir las que ya viste ({seenCount})
          </label>
        )}
        <label className="flex items-center gap-2 text-sm text-humo">
          <span className="sr-only md:not-sr-only">Ordenar</span>
          <select
            value={sort}
            onChange={e => onSortChange(e.target.value as SortKey)}
            className="field h-9 w-auto cursor-pointer px-3 py-0 text-sm"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map(k => (
              <option key={k} value={k} className="bg-sala-2">{SORT_LABELS[k]}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
