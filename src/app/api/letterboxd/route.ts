import { NextRequest, NextResponse } from "next/server";
import { fetchLetterboxdRSS, LetterboxdNotFoundError } from "@/lib/letterboxd/parser";
import { buildTasteProfile } from "@/lib/letterboxd/tasteProfile";

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{2,30}$/;

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username")?.trim();

  if (!username) {
    return NextResponse.json({ error: "Escribe tu usuario de Letterboxd." }, { status: 400 });
  }

  if (!USERNAME_PATTERN.test(username)) {
    return NextResponse.json({ error: "Ese usuario no es válido. Usa solo letras, números, guiones y guiones bajos." }, { status: 400 });
  }

  try {
    const films = await fetchLetterboxdRSS(username);

    if (films.length === 0) {
      return NextResponse.json(
        { error: "Este perfil no tiene películas en su diario. Registra alguna en Letterboxd y vuelve a intentarlo." },
        { status: 404 }
      );
    }

    const profile = await buildTasteProfile(username, films);
    return NextResponse.json(profile);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/letterboxd] Profile lookup failed:", message);
    if (err instanceof LetterboxdNotFoundError) {
      return NextResponse.json(
        { error: `No existe el usuario @${username} en Letterboxd. Revisa cómo está escrito.` },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "No se pudo leer ese perfil de Letterboxd. Comprueba que es público y vuelve a intentarlo." },
      { status: 502 }
    );
  }
}
