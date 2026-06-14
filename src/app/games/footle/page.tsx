import type { Metadata } from "next";
import GameShell from "@/components/games/GameShell";
import Footle from "@/components/games/Footle";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Footle — The Daily Footballer Wordle",
  description:
    "Footle is Wordle for footballers. Guess the mystery Premier League player in 8 tries. Each guess reveals how close you are on club, nationality, position, age and shirt number. New player every day.",
  path: "/games/footle",
  keywords: ["footle", "football wordle", "footballer wordle", "guess the footballer", "daily football game"],
});

export default function FootlePage() {
  return (
    <GameShell
      slug="footle"
      emoji="🟩"
      title="Footle"
      intro="The daily footballer Wordle. Guess the mystery Premier League player in eight tries — each guess tells you how close you are on position, club, nationality, age and shirt number."
      howTo={[
        "Type any Premier League player and pick them from the list.",
        "Green = exact match on that attribute.",
        "Yellow = close (age within 2 years, shirt within 3).",
        "Arrows ▲/▼ tell you if the target's age or shirt is higher or lower.",
        "Solve it in 8 guesses. A new player drops every day at midnight UTC.",
      ]}
    >
      <Footle />
    </GameShell>
  );
}
