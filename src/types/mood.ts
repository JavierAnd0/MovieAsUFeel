export type MoodCategory =
  | "happy"
  | "sad"
  | "anxious"
  | "relaxed"
  | "frustrated"
  | "thoughtful"
  | "excited"
  | "tired";

export type MoodInput = {
  categories: MoodCategory[];
  freeText?: string;
};

export type MoodSignal = {
  genres: number[];
  keywords: string[];
  sortBy: "popularity.desc" | "vote_average.desc" | "release_date.desc";
  voteThreshold: number;
  toneLabel: string;
};
