"use client";
import { useCompetition } from "@/components/CompetitionProvider";

/**
 * Honest banner for pages that are still Premier League-only (Players,
 * Fixtures). The global league switch is in the header, so if a visitor has
 * LaLiga selected we tell them this section hasn't been wired for it yet rather
 * than silently showing PL data.
 */
export default function CompetitionNote({ section }: { section: string }) {
  const { comp, setComp } = useCompetition();
  if (comp.slug === "premier-league") return null;
  return (
    <div className="card" style={{ padding: ".7rem 1rem", borderColor: "var(--gold)", color: "var(--muted)", fontSize: ".88rem", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <span>🚧 {section} for <strong style={{ color: "var(--text)" }}>{comp.name}</strong> are coming soon — showing the Premier League for now.</span>
      <button onClick={() => setComp("premier-league")} className="chip" style={{ cursor: "pointer" }}>Back to Premier League</button>
    </div>
  );
}
