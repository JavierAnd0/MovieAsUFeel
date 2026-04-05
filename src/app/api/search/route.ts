import { NextResponse } from "next/server";

const BASE = "https://api.themoviedb.org/3";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const key = process.env.TMDB_API_KEY;
  if (!key) return NextResponse.json({ results: [] });

  try {
    const url = new URL(`${BASE}/search/movie`);
    url.searchParams.set("api_key", key);
    url.searchParams.set("query", q);
    url.searchParams.set("language", "es");
    url.searchParams.set("page", "1");
    url.searchParams.set("include_adult", "false");

    const res = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return NextResponse.json({ results: [] });

    const data = await res.json();

    const results = (data.results ?? []).slice(0, 8).map((m: {
      id: number; title: string; release_date?: string; poster_path?: string | null;
    }) => ({
      id: m.id,
      title: m.title,
      year: m.release_date ? m.release_date.slice(0, 4) : "",
      posterPath: m.poster_path ?? null,
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
