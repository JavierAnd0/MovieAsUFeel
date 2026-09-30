import { NextRequest, NextResponse } from "next/server";
import { fetchLetterboxdRSS } from "@/lib/letterboxd/parser";
import { buildTasteProfile } from "@/lib/letterboxd/tasteProfile";

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{2,30}$/;

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username")?.trim();

  if (!username) {
    return NextResponse.json({ error: "Missing username parameter" }, { status: 400 });
  }

  if (!USERNAME_PATTERN.test(username)) {
    return NextResponse.json({ error: "Invalid username format" }, { status: 400 });
  }

  try {
    const films = await fetchLetterboxdRSS(username);

    if (films.length === 0) {
      return NextResponse.json(
        { error: "No films found. Make sure your Letterboxd diary is public and has entries." },
        { status: 404 }
      );
    }

    const profile = await buildTasteProfile(username, films);
    return NextResponse.json(profile);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/letterboxd] Profile lookup failed:", message);
    return NextResponse.json(
      { error: "Could not load that Letterboxd profile. Make sure it exists and is public." },
      { status: 502 }
    );
  }
}
