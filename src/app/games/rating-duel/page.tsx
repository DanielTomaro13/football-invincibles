import type { Metadata } from "next";
import GameShell from "@/components/games/GameShell";
import RatingDuel from "@/components/games/RatingDuel";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Rating Duel — Which Player Had the Better Season?",
  description:
    "Two real player-seasons, head to head. Pick the one with the higher rating and build the longest streak — stars and journeymen from the Premier League, LaLiga and Serie A across decades.",
  path: "/games/rating-duel",
  keywords: ["football rating game", "better season game", "player comparison game", "football streak game"],
});

export default function Page() {
  return (
    <GameShell
      slug="rating-duel"
      emoji="⚔️"
      title="Rating Duel"
      intro="Two real player-seasons go head to head. Tap the one you think earned the higher season rating — from across the Premier League, LaLiga and Serie A, decades deep. Every correct call keeps the winner on for the next duel."
      howTo={[
        "Two player-seasons appear with their ratings hidden.",
        "Tap whichever you think had the higher-rated season.",
        "Get it right and the winner stays on to face a new challenger.",
        "One wrong call ends the run — chase the longest streak.",
      ]}
    >
      <RatingDuel />
    </GameShell>
  );
}
