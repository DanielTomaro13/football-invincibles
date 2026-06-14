import type { Metadata } from "next";
import GameShell from "@/components/games/GameShell";
import InvinciblesGame from "@/components/games/InvinciblesGame";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Invincibles — Build an Unbeaten XI from 16 Seasons of Players",
  description:
    "Spin a random club from a random season going back 16 years, pick a real player rated on that exact campaign, and build your squad. Three modes — 5-a-side, full squad, or salary cap — then simulate 38 games and try to go invincible. Top the Invincibles Wall.",
  path: "/games/invincibles",
  keywords: [
    "invincibles game",
    "build a football team game",
    "unbeaten season simulator",
    "fantasy XI builder",
    "football squad builder game",
    "all-time premier league XI",
  ],
});

export default function InvinciblesPage() {
  return (
    <GameShell
      slug="invincibles"
      emoji="🏆"
      title="Invincibles"
      intro="Spin a random club from a random Premier League season — anywhere in the last 16 years — and pick one player, rated on that exact campaign. Build a 5-a-side, a full squad, or a salary-capped team, then simulate a 38-game season chasing an unbeaten record, just like Arsenal's 2003/04 Invincibles. Go the whole way undefeated and you make the Wall."
      howTo={[
        "Pick a mode: 5-a-side + 1 sub, full squad + 5 subs, or full squad under a salary cap. For the full squad you also choose one of three random formations.",
        "Each spin lands on a random club from a random season. Tap a player to see their stats, then add them to a position they can play.",
        "Positions matter — a striker can't fill a defender's slot. Multi-position players (★) can cover more than one slot; playing out of position costs rating, and the versatility boost applies only on the bench.",
        "Don't like the squad you spun? Re-spin for a fresh one — 5 re-spins for a full squad, 3 for 5-a-side.",
        "Fill every slot, then Simulate season. Zero losses = INVINCIBLE, and an all-win season tops the Wall.",
      ]}
    >
      <InvinciblesGame />
    </GameShell>
  );
}
