"use client";
import { useMemo, useState } from "react";
import { teamBadge } from "@/lib/api-client";
import type { LocalMatch } from "@/lib/local";

export default function MatchweekView({ matches }: { matches: LocalMatch[] }) {
  const weeks = useMemo(() => [...new Set(matches.map((m) => m.matchWeek))].sort((a, b) => a - b), [matches]);
  const [wk, setWk] = useState(weeks[weeks.length - 1] ?? 1);
  const shown = matches.filter((m) => m.matchWeek === wk);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* matchweek filter */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: ".72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em", marginRight: 4 }}>Matchweek</span>
        {weeks.map((w) => (
          <button
            key={w}
            onClick={() => setWk(w)}
            className="chip"
            style={{ cursor: "pointer", minWidth: 34, justifyContent: "center", color: wk === w ? "#04220f" : "var(--text)", background: wk === w ? "var(--accent)" : "var(--panel-2)" }}
          >
            {w}
          </button>
        ))}
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {shown.map((m) => (
          <div
            key={m.id}
            style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10, padding: ".7rem 1rem", borderBottom: "1px solid var(--border)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", fontWeight: 600 }}>
              {m.home.name}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.home.badge || teamBadge(m.home.id)} alt="" width={20} height={20} loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }} />
            </div>
            <div style={{ minWidth: 70, textAlign: "center", fontWeight: 800, background: "var(--panel-2)", borderRadius: 8, padding: ".25rem .5rem" }}>
              {m.home.score} – {m.away.score}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.away.badge || teamBadge(m.away.id)} alt="" width={20} height={20} loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }} />
              {m.away.name}
            </div>
          </div>
        ))}
        {shown.length === 0 && <div style={{ padding: "1rem", color: "var(--muted)" }}>No matches.</div>}
      </div>
    </div>
  );
}
