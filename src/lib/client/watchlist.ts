"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * "Mi lista" — two layers shown as one list:
 *   · "app": films saved in MovieAsUFeel. The user adds and removes these.
 *   · "letterboxd": the user's public Letterboxd watchlist. Read-only here;
 *     it is refreshed from Letterboxd, never edited.
 *
 * Everything reads and writes through this module (useWatchlist,
 * getWatchlistIds, syncLetterboxdWatchlist), so storage can move from
 * localStorage to a server later without touching components. Writes already
 * return promises and update the UI before they settle, which is what a
 * network-backed store will need.
 */
export type WatchlistSource = "app" | "letterboxd";

export type SavedMovie = {
  tmdbId: number;
  title: string;
  year: number;
  posterPath: string | null;
  voteAverage: number | null;
  savedAt: number;
  source: WatchlistSource;
};

export type SaveableMovie = Omit<SavedMovie, "savedAt" | "source">;

type LetterboxdLayer = { username: string; fetchedAt: number; films: SavedMovie[] };

const APP_KEY = "movieasufeel_watchlist";
const LETTERBOXD_KEY = "movieasufeel_letterboxd_watchlist";
const LETTERBOXD_MAX_AGE_MS = 6 * 60 * 60 * 1000;

type Snapshot = { app: SavedMovie[]; letterboxd: LetterboxdLayer | null; all: SavedMovie[] };
const EMPTY: Snapshot = { app: [], letterboxd: null, all: [] };

const listeners = new Set<() => void>();
let snapshot: Snapshot | null = null;

// ─── Storage (the only part that knows about localStorage) ──────────────────

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or storage full: the in-memory copy still serves this visit.
  }
}

function build(app: SavedMovie[], letterboxd: LetterboxdLayer | null): Snapshot {
  const appIds = new Set(app.map((m) => m.tmdbId));
  // A film in both layers shows once, as the user's own save (which they can remove)
  const fromLetterboxd = (letterboxd?.films ?? []).filter((m) => !appIds.has(m.tmdbId));
  return { app, letterboxd, all: [...app, ...fromLetterboxd] };
}

function read(): Snapshot {
  if (snapshot) return snapshot;
  const rawApp = readJSON<SavedMovie[]>(APP_KEY);
  // Lists saved before sources existed are all the user's own saves
  const app = Array.isArray(rawApp) ? rawApp.map((m) => ({ ...m, source: "app" as const })) : [];
  snapshot = build(app, readJSON<LetterboxdLayer>(LETTERBOXD_KEY));
  return snapshot;
}

function commit(next: Snapshot) {
  snapshot = next;
  listeners.forEach((l) => l());
}

async function saveApp(app: SavedMovie[]): Promise<void> {
  writeJSON(APP_KEY, app);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === APP_KEY || e.key === LETTERBOXD_KEY) {
      snapshot = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Every film on the list (both layers), for the recommendation request. */
export function getWatchlistIds(): number[] {
  return read().all.map((m) => m.tmdbId);
}

/**
 * Refreshes the Letterboxd layer for `username`. Skipped when the stored copy
 * is for the same user and recent, unless `force`. Failures leave the previous
 * copy in place: a stale watchlist beats an empty one.
 */
export async function syncLetterboxdWatchlist(username: string, { force = false } = {}): Promise<void> {
  const current = read().letterboxd;
  const sameUser = current?.username.toLowerCase() === username.toLowerCase();
  if (!force && sameUser && Date.now() - current.fetchedAt < LETTERBOXD_MAX_AGE_MS) return;

  try {
    const res = await fetch(`/api/letterboxd/watchlist?username=${encodeURIComponent(username)}`);
    if (!res.ok) return;
    const data = (await res.json()) as { username: string; films: Omit<SavedMovie, "savedAt" | "source">[] };
    const fetchedAt = Date.now();
    const layer: LetterboxdLayer = {
      username: data.username,
      fetchedAt,
      // Keep Letterboxd's order (most recently added first) through savedAt
      films: data.films.map((f, i) => ({ ...f, savedAt: fetchedAt - i, source: "letterboxd" })),
    };
    writeJSON(LETTERBOXD_KEY, layer);
    commit(build(read().app, layer));
  } catch {
    // Network error: keep whatever we had
  }
}

export function useWatchlist() {
  const state = useSyncExternalStore(subscribe, read, () => EMPTY);

  /** Where a film is on the list, or null if it isn't. */
  const sourceOf = useCallback(
    (id: number): WatchlistSource | null => state.all.find((m) => m.tmdbId === id)?.source ?? null,
    [state],
  );
  const isSaved = useCallback((id: number) => sourceOf(id) !== null, [sourceOf]);

  /** Adds or removes one of the user's own saves. Letterboxd films can't be removed from here. */
  const toggle = useCallback(async (movie: SaveableMovie): Promise<void> => {
    const { app, letterboxd } = read();
    const inApp = app.some((m) => m.tmdbId === movie.tmdbId);
    if (!inApp && letterboxd?.films.some((m) => m.tmdbId === movie.tmdbId)) return;

    const previous = app;
    const next = inApp
      ? app.filter((m) => m.tmdbId !== movie.tmdbId)
      : [{ ...movie, savedAt: Date.now(), source: "app" as const }, ...app];
    commit(build(next, letterboxd)); // optimistic: the UI changes before the write settles
    try {
      await saveApp(next);
    } catch {
      commit(build(previous, read().letterboxd));
    }
  }, []);

  const remove = useCallback(async (id: number): Promise<void> => {
    const { app, letterboxd } = read();
    const next = app.filter((m) => m.tmdbId !== id);
    commit(build(next, letterboxd));
    try {
      await saveApp(next);
    } catch {
      commit(build(app, read().letterboxd));
    }
  }, []);

  return {
    items: state.all,
    saved: state.app,
    letterboxd: state.letterboxd,
    sourceOf,
    isSaved,
    toggle,
    remove,
  };
}
