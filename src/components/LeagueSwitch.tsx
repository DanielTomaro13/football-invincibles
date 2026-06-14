"use client";
import { useCompetition } from "@/components/CompetitionProvider";
import { enabledCompetitions } from "@/lib/competitions";

/**
 * League switcher — swaps the active competition everywhere (game + data pages
 * read it from the CompetitionProvider). Shown in the header and on each page.
 */
export default function LeagueSwitch({ compact }: { compact?: boolean }) {
  const { comp, setComp } = useCompetition();
  const leagues = enabledCompetitions();

  return (
    <div
      role="tablist"
      aria-label="Choose competition"
      style={{ display: "inline-flex", gap: 3, padding: 3, borderRadius: 999, background: "var(--panel-2)", border: "1px solid var(--border)" }}
    >
      {leagues.map((l) => {
        const active = l.slug === comp.slug;
        return (
          <button
            key={l.slug}
            role="tab"
            aria-selected={active}
            onClick={() => setComp(l.slug)}
            title={l.name}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: compact ? "3px 9px" : "5px 12px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: compact ? ".74rem" : ".82rem",
              whiteSpace: "nowrap",
              background: active ? l.accent : "transparent",
              color: active ? "#06080f" : "var(--muted)",
            }}
          >
            <span aria-hidden>{l.badge}</span>
            {compact ? l.shortName.replace("Premier League", "PL") : l.shortName}
          </button>
        );
      })}
    </div>
  );
}
