import type { Metadata } from "next";
import CompetitionNote from "@/components/CompetitionNote";
import { getMatches, currentMatchweek } from "@/lib/local";
import { DEFAULT_COMPETITION, seasonLabel } from "@/lib/competitions";
import { pageMeta } from "@/lib/seo";
import MatchweekView from "@/components/MatchweekView";

export const metadata: Metadata = pageMeta({
  title: "Premier League Fixtures & Results",
  description:
    "Premier League results matchweek by matchweek — every score so far this season, filterable by round.",
  path: "/matches",
  keywords: ["premier league fixtures", "epl results", "football scores", "premier league matchweek"],
});

export default function MatchesPage() {
  const c = DEFAULT_COMPETITION;
  const matches = getMatches();
  const mw = currentMatchweek();

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <CompetitionNote section="Fixtures" />
      <div>
        <h1 style={{ fontSize: "1.9rem", fontWeight: 900, margin: "0 0 .25rem" }}>Results</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          {c.name} · {seasonLabel(c.currentSeason)} · {mw} matchweeks played
        </p>
      </div>
      <MatchweekView matches={matches} />
    </div>
  );
}
