"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useCompetition } from "@/components/CompetitionProvider";
import { loadStandings } from "@/lib/history";

interface Entry {
  team: { id: string; name: string };
  overall: { position: number; played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; points: number };
}

export default function HomeTable() {
  const { comp } = useCompetition();
  const [rows, setRows] = useState<Entry[]>([]);

  useEffect(() => {
    loadStandings(comp.dataPrefix).then((s) => setRows(s.slice(0, 5))).catch(() => setRows([]));
  }, [comp.dataPrefix]);

  return (
    <section>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>{comp.name} — Top of the table</h2>
        <Link href="/tables" style={{ color: "var(--accent)", fontSize: ".9rem", fontWeight: 600 }}>Full table →</Link>
      </div>
      <div className="card scroll-x">
        <table className="stat">
          <thead>
            <tr><th>#</th><th>Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.team.id}>
                <td>{e.overall.position}</td>
                <td style={{ fontWeight: 600 }}>{e.team.name}</td>
                <td>{e.overall.played}</td>
                <td>{e.overall.won}</td>
                <td>{e.overall.drawn}</td>
                <td>{e.overall.lost}</td>
                <td>{e.overall.goalsFor - e.overall.goalsAgainst}</td>
                <td style={{ fontWeight: 700 }}>{e.overall.points}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} style={{ color: "var(--muted)" }}>Loading…</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
