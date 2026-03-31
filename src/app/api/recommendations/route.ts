import { NextRequest, NextResponse } from "next/server";
import { mlRecommend }              from "@/lib/engine/mlEngine";
import { generateRecommendations }  from "@/lib/engine/recommendationEngine";
import type { TasteProfile }        from "@/types/letterboxd";
import type { MoodInput }           from "@/types/mood";

type RequestBody = {
  tasteProfile: TasteProfile;
  moodInput:    MoodInput;
};

export async function POST(req: NextRequest) {
  let body: RequestBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.tasteProfile || !body.moodInput) {
    return NextResponse.json(
      { error: "Missing tasteProfile or moodInput" },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.moodInput.categories) || body.moodInput.categories.length === 0) {
    return NextResponse.json(
      { error: "At least one mood category is required" },
      { status: 400 }
    );
  }

  try {
    // ── ML engine (SVD collaborative filtering) ──────────────────────────────
    // Uses pre-trained movie latent vectors from ml/data/artifacts/.
    // Returns null when artifacts aren't ready or user has too few ratings.
    const mlResult = mlRecommend(body.tasteProfile, body.moodInput);
    if (mlResult) {
      return NextResponse.json({ ...mlResult, engine: "ml" });
    }

    // ── Fallback: TMDB taste-first engine ────────────────────────────────────
    const result = await generateRecommendations(body.tasteProfile, body.moodInput);
    return NextResponse.json({ ...result, engine: "tmdb" });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
