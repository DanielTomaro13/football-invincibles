"use client";
import { useCompetition } from "@/components/CompetitionProvider";
import { enabledCompetitions } from "@/lib/competitions";

/**
 * League switcher — swaps the active competition everywhere (game + data pages
 * read it from the CompetitionProvider). All leagues are shown as pills so every
 * option (incl. Serie A) is visible at a glance. Pills are a comfortable 36px+
 * tap target and wrap to a new line on narrow screens rather than shrinking, so
 * they stay usable on iOS. `compact` just trims the labels/padding for the
 * header and dense boards.
 */
export default function LeagueSwitch({ compact }: { compact?: boolean }) {
  const { comp, setComp } = useCompetition();
  const leagues = enabledCompetitions();

  return (
    <div
      role="tablist"
      aria-label="Choose competition"
      style={{ display: "inline-flex", gap: 3, padding: 3, borderRadius: 999, background: "var(--panel-2)", border: "1px solid var(--border)", flexWrap: "wrap" }}
    >
      {leagues.map((l) => {
        const active = l.slug === comp.slug;
        const label = compact ? l.shortName.replace("Premier League", "PL") : l.shortName;
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
              justifyContent: "center",
              gap: 5,
              minHeight: compact ? 36 : 38, // comfortable iOS tap target
              padding: compact ? "0 11px" : "0 14px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: compact ? ".8rem" : ".82rem",
              whiteSpace: "nowrap",
              touchAction: "manipulation",
              background: active ? l.accent : "transparent",
              color: active ? l.accentInk : "var(--muted)",
            }}
          >
            <span aria-hidden>{l.badge}</span>
            {label}
          </button>
        );
      })}
    </div>
  );
}
