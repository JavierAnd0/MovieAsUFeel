import { NextResponse } from "next/server";

const BASE = "https://api.themoviedb.org/3";

type TMDBCrewMember  = { job: string; name: string };
type TMDBCastMember  = { name: string; order: number };
type TMDBCredits     = { crew: TMDBCrewMember[]; cast: TMDBCastMember[] };
type TMDBGenre       = { id: number; name: string };
type TMDBReleaseDate = { certification: string; type: number };
type TMDBReleaseDatesResult = { iso_3166_1: string; release_dates: TMDBReleaseDate[] };
type TMDBVideo       = { key: string; site: string; type: string; official: boolean };

type TMDBMovieDetail = {
  id: number;
  title: string;
  tagline: string;
  overview: string;
  release_date: string;
  runtime: number;
  vote_average: number;
  vote_count: number;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: TMDBGenre[];
  credits: TMDBCredits;
  release_dates?: { results: TMDBReleaseDatesResult[] };
  videos?: { results: TMDBVideo[] };
};

function formatRuntime(minutes: number): string {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}H ${m > 0 ? `${m}M` : ""}`.trim() : `${m}M`;
}

function formatVoteCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const key = process.env.TMDB_API_KEY;

  if (!key) return NextResponse.json({ error: "No API key" }, { status: 500 });

  try {
    const url = new URL(`${BASE}/movie/${id}`);
    url.searchParams.set("api_key", key);
    url.searchParams.set("language", "es");
    url.searchParams.set("append_to_response", "credits,release_dates,videos");

    const res = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Not found" }, { status: res.status });
    }

    const d = (await res.json()) as TMDBMovieDetail;

    // Director
    const director =
      d.credits?.crew?.find((c) => c.job === "Director")?.name ?? null;

    // Top 4 cast
    const cast =
      d.credits?.cast
        ?.sort((a, b) => a.order - b.order)
        .slice(0, 4)
        .map((a) => a.name) ?? [];

    // US certification (R, PG-13, etc.)
    const usRelease = d.release_dates?.results?.find(r => r.iso_3166_1 === "US");
    const certification =
      usRelease?.release_dates
        ?.find(rd => rd.certification && rd.certification.trim() !== "")
        ?.certification ?? null;

    // YouTube trailer key
    const trailer =
      d.videos?.results?.find(v => v.site === "YouTube" && v.type === "Trailer" && v.official) ??
      d.videos?.results?.find(v => v.site === "YouTube" && v.type === "Trailer");
    const trailerKey = trailer?.key ?? null;

    return NextResponse.json({
      id:            d.id,
      title:         d.title,
      tagline:       d.tagline ?? "",
      overview:      d.overview ?? "",
      year:          d.release_date ? d.release_date.slice(0, 4) : "",
      runtime:       formatRuntime(d.runtime),
      runtimeRaw:    d.runtime ?? 0,
      voteAverage:   d.vote_average ? Math.round(d.vote_average * 10) / 10 : null,
      voteCount:     formatVoteCount(d.vote_count ?? 0),
      posterPath:    d.poster_path ?? null,
      backdropPath:  d.backdrop_path ?? null,
      genres:        d.genres ?? [],
      director,
      cast,
      certification,
      trailerKey,
    });
  } catch (err) {
    console.error(`[/api/movie/${id}]`, err);
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
