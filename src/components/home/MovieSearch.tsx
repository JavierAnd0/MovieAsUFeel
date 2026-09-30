"use client";

import { useState, useEffect, useRef, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MovieDetailModal from "./MovieDetailModal";
import Icon from "@/components/ui/Icon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

type SearchResult = {
  id: number;
  title: string;
  year: string;
  posterPath: string | null;
};

export default function MovieSearch({ autoFocus = false }: { autoFocus?: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Debounced search; aborts in-flight requests so late responses never win.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setOpen(false); return; }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const data = await res.json();
        setResults(data.results ?? []);
        setActive(-1);
        setOpen(true);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 280);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function select(result: SearchResult) {
    setSelectedId(result.id);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => (i + 1) % results.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(i => (i <= 0 ? results.length - 1 : i - 1)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); select(results[active]); }
    else if (e.key === "Escape") setOpen(false);
  }

  const showEmpty = open && !loading && results.length === 0 && query.trim().length >= 2;

  return (
    <>
      <div ref={wrapRef} className="relative w-full">
        <div className="field flex h-10 items-center gap-2 px-3 focus-within:border-laton/60 focus-within:shadow-[0_0_0_3px_rgba(207,164,94,0.12)]">
          <Icon name="search" size={16} className="shrink-0 text-humo" />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            aria-label="Buscar una película"
            value={query}
            autoFocus={autoFocus}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Buscar una película"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent text-sm text-pantalla outline-none placeholder:text-humo/70 [&::-webkit-search-cancel-button]:hidden"
          />
          {loading && <span className="text-laton"><LoadingSpinner size={15} /></span>}
          {query && !loading && (
            <button
              onClick={() => { setQuery(""); setResults([]); setOpen(false); inputRef.current?.focus(); }}
              aria-label="Borrar búsqueda"
              className="shrink-0 rounded text-humo hover:text-pantalla"
            >
              <Icon name="close" size={15} />
            </button>
          )}
        </div>

        <AnimatePresence>
          {(open && results.length > 0) || showEmpty ? (
            <motion.ul
              id={listId}
              role="listbox"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 top-[calc(100%+6px)] z-[200] max-h-[60vh] overflow-y-auto rounded-xl border border-linea-fuerte bg-sala-2 py-1 shadow-[0_24px_64px_rgba(0,0,0,0.7)]"
            >
              {showEmpty && (
                <li className="px-4 py-3 text-sm text-humo">No encontramos «{query.trim()}». Prueba con el título original.</li>
              )}
              {results.map((r, i) => (
                <li
                  key={r.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => select(r)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${i === active ? "bg-laton/10" : ""}`}
                >
                  <div className="h-12 w-8 shrink-0 overflow-hidden rounded-md bg-sala-3">
                    {r.posterPath && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`https://image.tmdb.org/t/p/w92${r.posterPath}`} alt="" className="size-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-pantalla">{r.title}</p>
                    {r.year && <p className="text-xs text-humo">{r.year}</p>}
                  </div>
                </li>
              ))}
            </motion.ul>
          ) : null}
        </AnimatePresence>
      </div>

      <MovieDetailModal movieId={selectedId} onClose={() => setSelectedId(null)} />
    </>
  );
}
