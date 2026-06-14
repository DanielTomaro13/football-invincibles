import type { Metadata } from "next";
import GameShell from "@/components/games/GameShell";
import BeatTheClock from "@/components/games/BeatTheClock";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Beat the Clock — Name the Top Scorers in 60 Seconds",
  description:
    "How many of the Premier League's top scorers can you name in 60 seconds? A frantic football naming game against the clock.",
  path: "/games/starting-xi",
  keywords: ["name the top scorers", "football timed quiz", "beat the clock football"],
});

export default function Page() {
  return (
    <GameShell
      slug="starting-xi"
      emoji="⏱️"
      title="Beat the Clock"
      intro="Sixty seconds. Thirty top scorers. How many can you name before the whistle? Type fast — surnames count."
      howTo={[
        "Press Start to set the clock running.",
        "Type a top scorer's name and hit Enter.",
        "Correct names light up green on the board.",
        "When time's up, the ones you missed are revealed.",
      ]}
    >
      <BeatTheClock />
    </GameShell>
  );
}
