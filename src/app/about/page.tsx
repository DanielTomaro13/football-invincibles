import type { Metadata } from "next";
import Link from "next/link";
import { pageMeta, SITE } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "About",
  description: `What ${SITE.name} is, who builds it, and where the football data comes from.`,
  path: "/about",
});

export default function AboutPage() {
  return (
    <article style={{ maxWidth: 760, margin: "0 auto", display: "grid", gap: "1rem", lineHeight: 1.65 }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: 0 }}>About {SITE.name}</h1>

      <p style={{ color: "var(--muted)" }}>
        {SITE.name} is an independent football statistics hub and games arcade. It brings live league tables, stat
        leaders and player data together with a growing vault of free football mini-games — all in one fast,
        no-sign-up website covering the <strong>Premier League</strong> and <strong>LaLiga</strong>, with more
        competitions on the way.
      </p>

      <Section title="What you can do here">
        <ul style={ul}>
          <li><strong>Tables &amp; stats</strong> — standings and stat leaders for each competition, switchable in a tap.</li>
          <li><strong>Player data</strong> — searchable profiles with in-depth season stats.</li>
          <li><strong>The Invincibles game</strong> — draft a real XI from years of historical players and simulate a season chasing an unbeaten record.</li>
          <li><strong>Daily games</strong> — Footle, Higher or Lower, Guess the Player, Career Path, Beat the Clock and Score Predictor, with global leaderboards.</li>
        </ul>
      </Section>

      <Section title="Who's behind it">
        <p>
          {SITE.name} is built and maintained by <strong>Daniel Tomaro</strong>, an independent developer and football
          fan. It&apos;s a passion project — the same engine also powers a separate Australian-rules game,{" "}
          <a href="https://afl23-0.com" style={a} target="_blank" rel="noopener noreferrer">23-0</a>. Feedback and
          corrections are welcome via the <Link href="/contact" style={a}>Contact page</Link>.
        </p>
      </Section>

      <Section title="How the ratings work">
        <p>
          In the Invincibles game, every player is rated 0–99 from their real performance in a specific season. Players
          are percentile-ranked <em>within their position and that season</em> on the stats that matter for the role —
          goals and assists for attackers, clean sheets and defensive actions for defenders and keepers — and pulled
          toward a baseline if they barely featured. So a rating reflects how a player actually did that year, not
          reputation.
        </p>
      </Section>

      <Section title="Where the data comes from">
        <p>
          Statistics and standings are derived from publicly available league data feeds and refreshed regularly. The
          underlying match data originates from professional providers (Opta). {SITE.name} is an independent project and
          is <strong>not affiliated with, endorsed by, or sponsored by</strong> the Premier League, LaLiga, or any club.
          All club names and crests are the property of their respective owners and are used for identification only.
        </p>
      </Section>

      <Section title="Free to play">
        <p>
          The site is free and supported by advertising. See our{" "}
          <Link href="/privacy" style={a}>Privacy Policy</Link> for how data and ads are handled.
        </p>
      </Section>
    </article>
  );
}

const ul: React.CSSProperties = { margin: ".25rem 0", paddingLeft: "1.2rem", display: "grid", gap: 8, color: "var(--muted)" };
const a: React.CSSProperties = { color: "var(--accent)" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "grid", gap: 6 }}>
      <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: ".4rem 0 0" }}>{title}</h2>
      <div style={{ color: "var(--muted)" }}>{children}</div>
    </section>
  );
}
