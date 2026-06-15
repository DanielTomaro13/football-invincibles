"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { loadSeasonRosters, type HistPlayer } from "@/lib/history";
import { getCompetition, seasonLabel } from "@/lib/competitions";
import { safeId } from "@/lib/ids";

const POS_ORDER: Record<string, number> = { Goalkeeper: 0, Defender: 1, Midfielder: 2, Forward: 3 };
const POS_ABBR: Record<string, string> = { Goalkeeper: "GK", Defender: "DEF", Midfielder: "MID", Forward: "FWD" };

/** Interactive per-season squad list for a club page (client; the page shell is SSG). */
export default function ClubSquad({ compSlug, teamId, years }: { compSlug: string; teamId: string; years: string[] }) {
  const comp = getCompetition(compSlug);
  const [year, setYear] = useState(years[0] || "");
  const [squad, setSquad] = useState<HistPlayer[] | null>(null);

  useEffect(() => {
    if (!comp || !year) return;
    setSquad(null);
    loadSeasonRosters(year, comp.dataPrefix)
      .then((r) => setSquad((r[teamId] || []).slice().sort((a, b) => (POS_ORDER[a.pos] ?? 9) - (POS_ORDER[b.pos] ?? 9) || (b.rating ?? 0) - (a.rating ?? 0))))
      .catch(() => setSquad([]));
  }, [comp, teamId, year]);

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>Squad</h2>
        <select value={year} onChange={(e) => setYear(e.target.value)} style={{ minHeight: 34, padding: "0 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)", fontWeight: 700, fontFamily: "inherit" }}>
          {years.map((y) => <option key={y} value={y}>{seasonLabel(y)}</option>)}
        </select>
      </div>
      <div className="card" style={{ padding: ".25rem 0" }}>
        {squad === null ? <div style={{ padding: "1rem", color: "var(--muted)" }}>Loading…</div>
          : squad.length === 0 ? <div style={{ padding: "1rem", color: "var(--muted)" }}>No squad recorded.</div>
          : (
            <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {squad.map((p) => (
                <li key={String(p.id)}>
                  <Link href={`/player/${compSlug}/${safeId(p.id)}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: ".45rem 1rem", borderBottom: "1px solid var(--border)" }}>
                    <span className="chip" style={{ minWidth: 42, justifyContent: "center", flexShrink: 0 }}>{POS_ABBR[p.pos] || p.pos}</span>
                    <span style={{ flex: 1, minWidth: 0, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                    <span style={{ color: "var(--muted)", fontSize: ".8rem", flexShrink: 0 }}>{p.g}G {p.a}A</span>
                    <strong style={{ color: "var(--accent)", minWidth: 32, textAlign: "right", flexShrink: 0 }}>{p.rating}</strong>
                  </Link>
                </li>
              ))}
            </ol>
          )}
      </div>
    </section>
  );
}
