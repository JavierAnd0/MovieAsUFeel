import { NextRequest, NextResponse } from "next/server";
import { LetterboxdNotFoundError } from "@/lib/letterboxd/parser";
import { fetchLetterboxdWatchlist } from "@/lib/letterboxd/watchlist";

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{2,30}$/;

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username")?.trim();

  if (!username || !USERNAME_PATTERN.test(username)) {
    return NextResponse.json({ error: "Ese usuario no es válido." }, { status: 400 });
  }

  try {
    const films = await fetchLetterboxdWatchlist(username);
    return NextResponse.json({ username, films });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/letterboxd/watchlist] Lookup failed:", message);
    if (err instanceof LetterboxdNotFoundError) {
      return NextResponse.json({ error: `No existe el usuario @${username} en Letterboxd.` }, { status: 404 });
    }
    return NextResponse.json(
      { error: "No se pudo leer la watchlist de Letterboxd ahora mismo." },
      { status: 502 }
    );
  }
}
