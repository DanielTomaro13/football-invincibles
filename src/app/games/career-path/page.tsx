import type { Metadata } from "next";
import GameShell from "@/components/games/GameShell";
import CareerPath from "@/components/games/CareerPath";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Career Path — Name the Footballer Quiz",
  description:
    "Identify the Premier League footballer from their club, nationality, position, shirt number and age. Four options, one correct — how many can you get?",
  path: "/games/career-path",
  keywords: ["name the footballer", "football quiz", "guess the player multiple choice"],
});

export default function Page() {
  return (
    <GameShell
      slug="career-path"
      emoji="🧭"
      title="Career Path"
      intro="A footballer's profile — club, nation, position, shirt and age — with their name blanked out. Pick the right player from four options and keep the run going."
      howTo={[
        "Read the profile card.",
        "Choose the matching player from the four options.",
        "Green is correct, red is wrong — a new player loads automatically.",
        "Rack up the highest score you can.",
      ]}
    >
      <CareerPath />
    </GameShell>
  );
}
