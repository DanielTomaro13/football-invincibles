import type { Metadata } from "next";
import { pageMeta, SITE } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "About",
  description: `What ${SITE.name} is, where the data comes from, and what's coming next.`,
  path: "/about",
});

export default function AboutPage() {
  return (
    <article style={{ maxWidth: 720, display: "grid", gap: "1rem", lineHeight: 1.6 }}>
      <h1 style={{ fontSize: "1.9rem", fontWeight: 900, margin: 0 }}>About {SITE.name}</h1>
      <p style={{ color: "var(--muted)" }}>
        {SITE.name} is a football stats hub and games arcade in one. Browse live
        league tables, stat leaders, fixtures and player profiles — then test
        yourself against a growing vault of daily mini-games.
      </p>
      <h2 style={{ fontSize: "1.2rem", fontWeight: 800 }}>The Invincibles idea</h2>
      <p style={{ color: "var(--muted)" }}>
        Inspired by perfect-season squad builders, our flagship game lets you spin
        clubs and eras, draft a starting XI from real players, and simulate a
        season chasing the holy grail: going <em>invincible</em> — a whole
        campaign unbeaten.
      </p>
      <h2 style={{ fontSize: "1.2rem", fontWeight: 800 }}>Built to scale</h2>
      <p style={{ color: "var(--muted)" }}>
        We start with the Premier League, but every page runs through a
        competition-agnostic engine. LaLiga, Serie A, Bundesliga, Ligue 1 and the
        Champions League are next.
      </p>
      <h2 style={{ fontSize: "1.2rem", fontWeight: 800 }}>Data</h2>
      <p style={{ color: "var(--muted)" }}>
        Stats and fixtures are sourced from publicly available football data feeds
        and refreshed regularly. {SITE.name} is an independent project and is not
        affiliated with or endorsed by the Premier League or any club.
      </p>
    </article>
  );
}
