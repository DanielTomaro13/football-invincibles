import type { Metadata } from "next";
import GameShell from "@/components/games/GameShell";
import ScorePredictor from "@/components/games/ScorePredictor";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Score Predictor — Call the Scoreline",
  description:
    "Predict the exact scoreline of real Premier League matches. 5 points for the exact score, 2 for the right result. How sharp is your football brain?",
  path: "/games/score-predictor",
  keywords: ["score predictor", "predict the score football", "football prediction game"],
});

export default function Page() {
  return (
    <GameShell
      slug="score-predictor"
      emoji="🎯"
      title="Score Predictor"
      intro="Real Premier League fixtures, scores hidden. Call the scoreline before the reveal. Exact scores earn 5 points; getting the result right earns 2."
      howTo={[
        "Set your predicted score for each match using the steppers.",
        "Lock in your prediction to reveal the real result.",
        "5 points for an exact scoreline, 2 for the correct outcome.",
        "Play through ten fixtures and chase a high total.",
      ]}
    >
      <ScorePredictor />
    </GameShell>
  );
}
