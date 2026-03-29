import { XMLParser } from "fast-xml-parser";
import type { WatchedFilm } from "@/types/letterboxd";

type RSSItem = {
  title?: string;
  link?: string;
  "letterboxd:watchedDate"?: string;
  "letterboxd:memberRating"?: number;
  "letterboxd:filmYear"?: number;
  "letterboxd:filmTitle"?: string;
};

export async function fetchLetterboxdRSS(username: string): Promise<WatchedFilm[]> {
  const url = `https://letterboxd.com/${encodeURIComponent(username)}/rss/`;
  const res = await fetch(url, {
    headers: { "User-Agent": "MovieAsUFeel/1.0" },
    next: { revalidate: 0 },
  });

  if (res.status === 404) {
    throw new Error(`Letterboxd user "${username}" not found. Check the username and make sure the profile is public.`);
  }
  if (!res.ok) {
    throw new Error(`Could not fetch Letterboxd profile (${res.status}). Make sure your profile is public.`);
  }

  const xml = await res.text();
  return parseRSS(xml);
}

export function parseRSS(xml: string): WatchedFilm[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    isArray: (name) => name === "item",
  });

  const result = parser.parse(xml);
  const items: RSSItem[] = result?.rss?.channel?.item ?? [];

  const films: WatchedFilm[] = [];

  for (const item of items) {
    // Only include diary entries (have a watchedDate), skip list entries etc.
    if (!item["letterboxd:watchedDate"] && !item["letterboxd:filmTitle"]) continue;

    const rawTitle = item["letterboxd:filmTitle"] ?? item.title ?? "";
    const title = cleanTitle(rawTitle);
    if (!title) continue;

    const year = item["letterboxd:filmYear"] ?? extractYearFromTitle(item.title ?? "") ?? 0;
    const rating = item["letterboxd:memberRating"];
    const watchedDate = item["letterboxd:watchedDate"] ?? "";
    const letterboxdUrl = item.link ?? "";

    films.push({
      title,
      year: Number(year),
      letterboxdUrl,
      rating: rating ? Number(rating) : undefined,
      watchedDate,
    });
  }

  // Most recent first, cap at 100
  return films.slice(0, 100);
}

function cleanTitle(raw: string): string {
  // RSS titles look like "Inception, 2010 - ★★★★" — strip everything after comma+year
  return raw.replace(/,\s*\d{4}.*$/, "").trim();
}

function extractYearFromTitle(title: string): number | undefined {
  const match = title.match(/,\s*(\d{4})/);
  return match ? parseInt(match[1]) : undefined;
}
