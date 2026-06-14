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
        "Choose a mode: 5-a-side + 1 sub, full squad + 5 subs, or full squad under a £400m salary cap.",
        "Each spin gives you a random club from a random season — pick one player from that squad to add to your team.",
        "Don't like the options? You get 3 club re-spins and 3 year re-spins per attempt.",
        "Every player is rated on their real performance that season, so 2007 Ronaldo ≠ a journeyman.",
        "Fill your squad, then Simulate season. Zero losses = INVINCIBLE, and an all-win season tops the Wall.",
      ]}
    >
      <InvinciblesGame />
    </GameShell>
  );
}
