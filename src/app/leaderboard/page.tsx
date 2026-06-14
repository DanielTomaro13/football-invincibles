import type { Metadata } from "next";
import LeaderboardView from "@/components/games/LeaderboardView";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Hall of Fame — Football Games Leaderboards",
  description:
    "The Football Invincibles Hall of Fame. Global leaderboards and your personal bests across every game — Invincibles, Higher or Lower, Beat the Clock, Score Predictor — plus your daily Footle and Guess the Player streaks.",
  path: "/leaderboard",
  keywords: ["football game leaderboard", "footle streak", "high scores", "hall of fame"],
});

export default function LeaderboardPage() {
  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div>
        <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: "0 0 .3rem" }}>🏆 Hall of Fame</h1>
        <p style={{ color: "var(--muted)", margin: 0, maxWidth: 640 }}>
          Your streaks, your personal bests, and the all-time top scores across the Games Vault.
        </p>
      </div>
      <LeaderboardView />
    </div>
  );
}
