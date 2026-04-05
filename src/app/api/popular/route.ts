import { NextResponse } from "next/server";

const BASE = "https://api.themoviedb.org/3";

type TMDBMovie = {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
};

type TMDBPopularResponse = {
  results: TMDBMovie[];
};

export async function GET() {
  try {
    const key = process.env.TMDB_API_KEY;
    if (!key) {
      console.error("[/api/popular] TMDB_API_KEY not configured");
      return NextResponse.json({ movies: [] });
    }

    // Pick a random page (1–8) so the carousel varies on every load
    const page = Math.floor(Math.random() * 8) + 1;

    const url = new URL(`${BASE}/movie/popular`);
    url.searchParams.set("api_key", key);
    url.searchParams.set("language", "es");
    url.searchParams.set("page", String(page));

    const res = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(8000), // 8s timeout — never hang
    });

    if (!res.ok) {
      console.error(`[/api/popular] TMDB returned ${res.status}`);
      return NextResponse.json({ movies: [] });
    }

    const data = (await res.json()) as TMDBPopularResponse;

    // Shuffle and pick 20 movies that have a poster
    const shuffled = (data.results ?? [])
      .filter((m) => m.poster_path)
      .sort(() => Math.random() - 0.5)
      .slice(0, 20);

    const movies = shuffled.map((m) => ({
      id: m.id,
      title: m.title,
      posterPath: m.poster_path,
    }));

    return NextResponse.json({ movies });
  } catch (err) {
    // Network error, timeout, JSON parse failure — always return valid JSON
    console.error("[/api/popular] Unexpected error:", err);
    return NextResponse.json({ movies: [] });
  }
}
