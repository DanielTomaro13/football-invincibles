import type { Metadata } from "next";
import GameShell from "@/components/games/GameShell";
import InvinciblesGame from "@/components/games/InvinciblesGame";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Invincibles — Build an Unbeaten XI & Simulate a Season",
  description:
    "Spin a starting XI from real Premier League players, lock your favourites, re-roll the rest, then simulate a 38-game season. Can you go invincible — a whole campaign unbeaten? Hard but achievable.",
  path: "/games/invincibles",
  keywords: [
    "invincibles game",
    "build a football team game",
    "unbeaten season simulator",
    "fantasy XI builder",
    "football squad builder game",
  ],
});

export default function InvinciblesPage() {
  return (
    <GameShell
      slug="invincibles"
      emoji="🏆"
      title="Invincibles"
      intro="Assemble a starting XI from real Premier League players, then simulate a full 38-game season. The holy grail: go invincible — an entire campaign without a single defeat, just like Arsenal's 2003/04 side. It's deliberately tough: only a near-perfect XI gets a real shot, and even then it's rare."
      howTo={[
        "Hit Spin XI to fill your 4-3-3 with random real players.",
        "Lock 🔒 the players you want to keep.",
        "Re-roll 🔄 individual slots (you have a limited number) or re-spin the unlocked ones to upgrade your side.",
        "Push your team rating as high as you can — only a near-perfect XI gets a real shot, and even then it's rare (capped at 5%).",
        "Hit Simulate season to play out 38 games against the real league. Zero losses = INVINCIBLE.",
      ]}
    >
      <InvinciblesGame />
    </GameShell>
  );
}
