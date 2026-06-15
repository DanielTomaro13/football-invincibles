import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { pageMeta, SITE } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Football Games — Footle, Higher or Lower, Guess the Player & more",
  description:
    "Play free football mini-games: Footle (the footballer Wordle), Higher or Lower, Guess the Player, Career Path, Beat the Clock, Score Predictor and the Invincibles squad-builder. New puzzles daily.",
  path: "/games",
  keywords: [
    "football games",
    "footle",
    "football wordle",
    "guess the footballer",
    "higher or lower football game",
    "football quiz",
  ],
});

const GAMES = [
  { slug: "invincibles", title: "Invincibles", emoji: "🏆", blurb: "Spin clubs & eras, draft an XI and simulate a season chasing an unbeaten record.", tag: "Flagship" },
  { slug: "footle", title: "Footle", emoji: "🟩", blurb: "The footballer Wordle. Guess the mystery player in 8 tries — clues on club, nation, position, age and shirt.", tag: "Daily" },
  { slug: "higher-or-lower", title: "Higher or Lower", emoji: "⚖️", blurb: "Did this player score more or fewer goals than the next? Build the longest streak.", tag: "Endless" },
  { slug: "rating-duel", title: "Rating Duel", emoji: "⚔️", blurb: "Two real player-seasons head to head — pick the higher-rated one. Three leagues, decades deep.", tag: "Endless" },
  { slug: "guess-the-player", title: "Guess the Player", emoji: "🕵️", blurb: "Clues reveal one by one. Solve it early for maximum points.", tag: "Daily" },
  { slug: "career-path", title: "Career Path", emoji: "🧭", blurb: "Identify the player from club, nation, position and shirt number alone.", tag: "Quiz" },
  { slug: "starting-xi", title: "Beat the Clock", emoji: "⏱️", blurb: "Name as many Premier League top scorers as you can in 60 seconds.", tag: "Timed" },
  { slug: "score-predictor", title: "Score Predictor", emoji: "🎯", blurb: "Predict scorelines on real fixtures and rack up accuracy points.", tag: "Predict" },
];

export default function GamesHub() {
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Football Invincibles games",
    itemListElement: GAMES.map((g, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE.url}/games/${g.slug}`,
      name: g.title,
    })),
  };

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <JsonLd data={itemListLd} />
      <div>
        <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: "0 0 .3rem" }}>The Games Vault</h1>
        <p style={{ color: "var(--muted)", margin: 0, maxWidth: 640 }}>
          Free, fast, no sign-up. New puzzles every day. Built on real football data.
        </p>
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))" }}>
        {GAMES.map((g) => (
          <Link
            key={g.slug}
            href={`/games/${g.slug}`}
            className="card"
            style={{ padding: "1.25rem", display: "grid", gap: 8, position: "relative" }}
          >
            <span className="chip" style={{ position: "absolute", top: 12, right: 12 }}>{g.tag}</span>
            <span style={{ fontSize: "2rem" }}>{g.emoji}</span>
            <strong style={{ fontSize: "1.2rem" }}>{g.title}</strong>
            <span style={{ color: "var(--muted)", fontSize: ".9rem" }}>{g.blurb}</span>
            <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: ".9rem", marginTop: 4 }}>Play →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
