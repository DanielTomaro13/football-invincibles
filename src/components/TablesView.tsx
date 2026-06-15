"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useCompetition } from "@/components/CompetitionProvider";
import LeagueSwitch from "@/components/LeagueSwitch";
import { loadStandings } from "@/lib/history";
import { getCompetition, seasonLabel } from "@/lib/competitions";
import { safeId } from "@/lib/ids";

const plBadge = (id: string) => `https://resources.premierleague.com/premierleague25/badges/${id}.svg`;

interface Entry {
  team: { id: string; name: string; shortName: string; abbr: string; badge?: string | null };
  overall: { position: number; played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; points: number; startingPosition: number };
}

// `forceSlug` pins the table to one league (the /tables/<competition> SEO pages);
// without it the table follows the global league switch.
export default function TablesView({ forceSlug }: { forceSlug?: string }) {
  const { comp: globalComp, setComp } = useCompetition();
  const comp = (forceSlug && getCompetition(forceSlug)) || globalComp;
  const [rows, setRows] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  // keep the global switch in sync when arriving on a pinned league URL
  useEffect(() => { if (forceSlug && forceSlug !== globalComp.slug) setComp(forceSlug); }, [forceSlug, globalComp.slug, setComp]);

  useEffect(() => {
    setLoading(true);
    loadStandings(comp.dataPrefix).then((s) => { setRows(s); setLoading(false); }).catch(() => { setRows([]); setLoading(false); });
  }, [comp.dataPrefix]);

  const played = rows[0]?.overall.played ?? 0;

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "1.9rem", fontWeight: 900, margin: "0 0 .25rem" }}>{comp.name} Table</h1>
          <p style={{ color: "var(--muted)", margin: 0 }}>{seasonLabel(comp.currentSeason)} · after {played} matchweeks.</p>
        </div>
        <LeagueSwitch />
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="stat">
          <thead>
            <tr><th>#</th><th>Club</th><th>Pl</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const gd = e.overall.goalsFor - e.overall.goalsAgainst;
              const move = e.overall.startingPosition - e.overall.position;
              return (
                <tr key={e.team.id}>
                  <td>{e.overall.position} {move !== 0 && <span className={move > 0 ? "hl-up" : "hl-down"} style={{ fontSize: ".7rem" }}>{move > 0 ? "▲" : "▼"}</span>}</td>
                  <td style={{ fontWeight: 600 }}>
                    <Link href={`/club/${comp.slug}/${safeId(e.team.id)}`} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={e.team.badge || plBadge(e.team.id)} alt="" width={20} height={20} loading="lazy" onError={(ev) => { (ev.target as HTMLImageElement).style.visibility = "hidden"; }} />
                      {e.team.name}
                    </Link>
                  </td>
                  <td>{e.overall.played}</td><td>{e.overall.won}</td><td>{e.overall.drawn}</td><td>{e.overall.lost}</td>
                  <td>{e.overall.goalsFor}</td><td>{e.overall.goalsAgainst}</td>
                  <td style={{ color: gd > 0 ? "var(--accent)" : gd < 0 ? "var(--danger)" : undefined }}>{gd > 0 ? "+" : ""}{gd}</td>
                  <td style={{ fontWeight: 800 }}>{e.overall.points}</td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 && <tr><td colSpan={10} style={{ color: "var(--muted)" }}>No table available.</td></tr>}
            {loading && <tr><td colSpan={10} style={{ color: "var(--muted)" }}>Loading…</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
