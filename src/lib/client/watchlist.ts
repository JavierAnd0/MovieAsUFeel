"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Minimal movie snapshot kept in "Mi lista" so the list renders without refetching. */
export type SavedMovie = {
  tmdbId: number;
  title: string;
  year: number;
  posterPath: string | null;
  voteAverage: number | null;
  savedAt: number;
};

const STORAGE_KEY = "movieasufeel_watchlist";
const EMPTY: SavedMovie[] = [];
const listeners = new Set<() => void>();

let cache: SavedMovie[] | null = null;

function read(): SavedMovie[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: SavedMovie[]) {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode or storage full: keep the in-memory copy for this visit.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useWatchlist() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);

  const isSaved = useCallback((id: number) => items.some((m) => m.tmdbId === id), [items]);

  const toggle = useCallback((movie: Omit<SavedMovie, "savedAt">) => {
    const current = read();
    write(
      current.some((m) => m.tmdbId === movie.tmdbId)
        ? current.filter((m) => m.tmdbId !== movie.tmdbId)
        : [{ ...movie, savedAt: Date.now() }, ...current]
    );
  }, []);

  const remove = useCallback((id: number) => {
    write(read().filter((m) => m.tmdbId !== id));
  }, []);

  return { items, isSaved, toggle, remove };
}
