import type { Metadata } from "next";
import GameShell from "@/components/games/GameShell";
import GuessThePlayer from "@/components/games/GuessThePlayer";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Guess the Player — Daily Football Clue Game",
  description:
    "Identify the mystery Premier League footballer from clues revealed one at a time — nationality, position, age, club and shirt number. Fewer clues means more points.",
  path: "/games/guess-the-player",
  keywords: ["guess the player", "guess the footballer", "football clue game", "mystery player game"],
});

export default function Page() {
  return (
    <GameShell
      slug="guess-the-player"
      emoji="🕵️"
      title="Guess the Player"
      intro="A mystery footballer is hidden behind a stack of clues. Each clue you reveal — nationality, position, age, club, shirt — costs you points. Crack it early to top the leaderboard."
      howTo={[
        "Start with one clue showing.",
        "Guess a player at any time using the search box.",
        "Stuck? Reveal another clue — but your potential score drops.",
        "A wrong guess also costs points and reveals the next clue.",
        "Solve it in as few clues as possible.",
      ]}
    >
      <GuessThePlayer />
    </GameShell>
  );
}
