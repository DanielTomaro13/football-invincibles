import Link from "next/link";
import type { Metadata } from "next";
import { enabledCompetitions } from "@/lib/competitions";
import { pageMeta } from "@/lib/seo";
import HomeLeaderboard from "@/components/HomeLeaderboard";
import HomeTable from "@/components/HomeTable";

export const metadata: Metadata = pageMeta({
  title: "Football Invincibles — Football Stats, Tables & Mini-Games",
  description:
    "Live Premier League, LaLiga and Serie A tables and stats, deep player and club profiles, match centres, and a vault of free football mini-games: build an unbeaten Invincibles XI from decades of real players, plus Footle, Higher or Lower, Guess the Player, Career Path, Beat the Clock and Score Predictor. New daily puzzles, global leaderboards, no sign-up.",
  path: "/",
  keywords: [
    "football games",
    "free football games online",
    "premier league table",
    "guess the footballer game",
    "football wordle",
    "footle",
    "higher or lower football",
    "build a football team game",
    "football quiz",
    "fantasy XI builder",
  ],
});

const GAMES = [
  { slug: "invincibles", title: "Invincibles", blurb: "Spin a year & club, pick real players, go unbeaten.", emoji: "🏆" },
  { slug: "footle", title: "Footle", blurb: "Wordle for footballers — 8 guesses, new player daily.", emoji: "🟩" },
  { slug: "higher-or-lower", title: "Higher or Lower", blurb: "Which player scored more? Keep the streak alive.", emoji: "⚖️" },
  { slug: "rating-duel", title: "Rating Duel", blurb: "Pick the higher-rated season. Three leagues, decades deep.", emoji: "⚔️" },
  { slug: "guess-the-player", title: "Guess the Player", blurb: "Reveal clues one at a time. Fewer = more points.", emoji: "🕵️" },
  { slug: "career-path", title: "Career Path", blurb: "Name the player from their shirt, club & nation.", emoji: "🧭" },
  { slug: "starting-xi", title: "Beat the Clock", blurb: "Name as many top scorers as you can in 60s.", emoji: "⏱️" },
  { slug: "score-predictor", title: "Score Predictor", blurb: "Call the scoreline on real fixtures.", emoji: "🎯" },
];

export default function Home() {
  return (
    <div style={{ display: "grid", gap: "2.5rem" }}>
      {/* Hero */}
      <section className="card" style={{ padding: "2.5rem 1.5rem", textAlign: "center", overflow: "hidden" }}>
        <h1 style={{ fontSize: "clamp(2rem,5vw,3.4rem)", lineHeight: 1.05, margin: "0 0 .6rem", fontWeight: 900 }}>
          Build your <span style={{ color: "var(--accent)" }}>Invincible</span> XI.
          <br /> Master the football <span style={{ color: "var(--accent2)" }}>vault</span>.
        </h1>
        <p style={{ color: "var(--muted)", maxWidth: 640, margin: "0 auto 1.4rem", fontSize: "1.05rem" }}>
          Spin clubs and seasons, draft real Premier League, LaLiga and Serie A players, and chase an
          unbeaten campaign. Plus live tables, player &amp; club profiles, match centres and a vault of daily football puzzles.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/games/invincibles" className="btn btn-primary">🏆 Play Invincibles</Link>
          <Link href="/games/invincibles?mode=five" className="btn">⚡ Quick 5-a-side</Link>
          <Link href="/games" className="btn">All games</Link>
          <Link href="/tables" className="btn">League table</Link>
        </div>
      </section>

      {/* Games grid */}
      <section>
        <SectionHead title="The Games Vault" href="/games" cta="See all" />
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))" }}>
          {GAMES.map((g) => (
            <Link key={g.slug} href={`/games/${g.slug}`} className="card" style={{ padding: "1.1rem", display: "grid", gap: 6 }}>
              <span style={{ fontSize: "1.7rem" }}>{g.emoji}</span>
              <strong style={{ fontSize: "1.05rem" }}>{g.title}</strong>
              <span style={{ color: "var(--muted)", fontSize: ".88rem" }}>{g.blurb}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Leaderboards */}
      <section>
        <SectionHead title="Leaderboards" href="/leaderboard" cta="Hall of Fame" />
        <HomeLeaderboard />
      </section>

      {/* Live table snippet (competition-aware) */}
      <HomeTable />

      {/* Competitions */}
      <section>
        <SectionHead title="Competitions" href="/competitions" cta="View all" />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {enabledCompetitions().map((comp) => (
            <Link key={comp.slug} href={`/tables/${comp.slug}`} className="chip" style={{ color: "var(--text)", padding: ".5rem 1rem" }}>
              ✅ {comp.name}
            </Link>
          ))}
          <span className="chip">🔜 Bundesliga · Ligue 1 · UCL</span>
        </div>
      </section>
    </div>
  );
}

function SectionHead({ title, href, cta }: { title: string; href: string; cta: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
      <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>{title}</h2>
      <Link href={href} style={{ color: "var(--accent)", fontSize: ".9rem", fontWeight: 600 }}>{cta} →</Link>
    </div>
  );
}
