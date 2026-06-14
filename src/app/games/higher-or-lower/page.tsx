import type { Metadata } from "next";
import GameShell from "@/components/games/GameShell";
import HigherOrLower from "@/components/games/HigherOrLower";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Higher or Lower — Football Stats Streak Game",
  description:
    "Did this footballer score more or fewer goals than the next? The classic Higher or Lower game with real Premier League players. Build the longest streak you can.",
  path: "/games/higher-or-lower",
  keywords: ["higher or lower football", "football stats game", "goals streak game"],
});

export default function Page() {
  return (
    <GameShell
      slug="higher-or-lower"
      emoji="⚖️"
      title="Higher or Lower"
      intro="One player's stat is hidden. Decide whether they recorded more or fewer than the player beside them — goals, assists or appearances. Every correct call extends your streak; one slip ends it."
      howTo={[
        "Read the prompt — it tells you which stat is in play.",
        "Hit More if you think the hidden player has at least as many; Fewer if not.",
        "Each correct answer carries forward and draws a new challenger.",
        "Chase the longest streak — there's no limit.",
      ]}
    >
      <HigherOrLower />
    </GameShell>
  );
}
