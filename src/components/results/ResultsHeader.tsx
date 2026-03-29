import Badge from "@/components/ui/Badge";
import { MOOD_META } from "@/lib/mood/moodMap";
import type { MoodCategory } from "@/types/mood";
import type { TasteProfile } from "@/types/letterboxd";
import type { RecommendationsResponse } from "@/types/recommendation";

type Props = {
  profile: TasteProfile;
  moodCategories: MoodCategory[];
  result: RecommendationsResponse;
};

export default function ResultsHeader({ profile, moodCategories, result }: Props) {
  const moodEmojis = moodCategories.map((c) => MOOD_META[c].emoji).join(" ");

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 px-5 py-4">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-gray-100">
            {moodEmojis} {result.movies.length} películas para ti
          </p>
          <p className="text-sm text-gray-500">
            Basado en {profile.filmCount} películas vistas por @{profile.username}
            {result.meta.filteredOut > 0 && ` · ${result.meta.filteredOut} ya vistas filtradas`}
          </p>
        </div>
        {result.meta.genresUsed.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {result.meta.genresUsed.map((g) => (
              <Badge key={g} variant="accent">
                {g}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
