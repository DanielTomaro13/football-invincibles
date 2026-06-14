"use client";
import { useCompetition } from "@/components/CompetitionProvider";
import { enabledCompetitions } from "@/lib/competitions";

/**
 * League switcher — swaps the active competition everywhere (game + data pages
 * read it from the CompetitionProvider).
 *
 * `compact` (used in the cramped site header and on dense boards) renders a
 * native <select>: on iOS this opens the full-screen wheel picker, so it stays
 * a comfortable tap target no matter how many leagues exist. The roomy default
 * variant renders pill tabs.
 */
export default function LeagueSwitch({ compact }: { compact?: boolean }) {
  const { comp, setComp } = useCompetition();
  const leagues = enabledCompetitions();

  if (compact) {
    return (
      <label style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
        <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
          Choose competition
        </span>
        <select
          aria-label="Choose competition"
          value={comp.slug}
          onChange={(e) => setComp(e.target.value)}
          style={{
            appearance: "none",
            WebkitAppearance: "none",
            minHeight: 38, // comfortable iOS tap target
            padding: "0 30px 0 14px",
            borderRadius: 999,
            border: "1px solid var(--border)",
            background: comp.accent,
            color: comp.accentInk,
            fontWeight: 800,
            fontSize: "0.9rem",
            fontFamily: "inherit",
            cursor: "pointer",
            touchAction: "manipulation",
            // chevron
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M2 4l4 4 4-4' stroke='white' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 11px center",
          }}
        >
          {leagues.map((l) => (
            <option key={l.slug} value={l.slug} style={{ color: "#111", background: "#fff" }}>
              {l.badge} {l.shortName}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div
      role="tablist"
      aria-label="Choose competition"
      style={{ display: "inline-flex", gap: 3, padding: 3, borderRadius: 999, background: "var(--panel-2)", border: "1px solid var(--border)", flexWrap: "wrap" }}
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
              justifyContent: "center",
              gap: 5,
              minHeight: 38, // comfortable iOS tap target
              padding: "0 14px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: ".82rem",
              whiteSpace: "nowrap",
              touchAction: "manipulation",
              background: active ? l.accent : "transparent",
              color: active ? l.accentInk : "var(--muted)",
            }}
          >
            <span aria-hidden>{l.badge}</span>
            {l.shortName}
          </button>
        );
      })}
    </div>
  );
}
