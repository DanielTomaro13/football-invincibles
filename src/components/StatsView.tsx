"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCompetition } from "@/components/CompetitionProvider";
import LeagueSwitch from "@/components/LeagueSwitch";
import { loadSeasonRosters, type HistPlayer } from "@/lib/history";
import { seasonLabel } from "@/lib/competitions";
import { slugify } from "@/lib/format";

const plPhoto = (id: string | number) => `https://resources.premierleague.com/premierleague25/photos/players/40x40/${id}.png`;

interface Row extends HistPlayer { team: string }

const BOARDS: { key: string; label: string; stat: keyof HistPlayer; gkOnly?: boolean }[] = [
  { key: "goals", label: "Top Scorers", stat: "g" },
  { key: "assists", label: "Assists", stat: "a" },
  { key: "clean", label: "Clean Sheets", stat: "cs", gkOnly: true },
  { key: "apps", label: "Appearances", stat: "apps" },
];

export default function StatsView() {
  const { comp } = useCompetition();
  const [players, setPlayers] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    loadSeasonRosters(comp.currentSeason, comp.dataPrefix)
      .then((rosters) => {
        const all: Row[] = [];
        for (const list of Object.values(rosters)) for (const p of list as HistPlayer[]) all.push({ ...p, team: "" });
        setPlayers(all);
        setLoading(false);
      })
      .catch(() => { setPlayers([]); setLoading(false); });
  }, [comp.dataPrefix, comp.currentSeason]);

  const boards = useMemo(
    () =>
      BOARDS.map((b) => ({
        ...b,
        rows: players
          .filter((p) => (b.gkOnly ? p.pos === "Goalkeeper" : true))
          .map((p) => ({ p, v: Math.round((p[b.stat] as number) ?? 0) }))
          .filter((r) => r.v > 0)
          .sort((a, c) => c.v - a.v)
          .slice(0, 10),
      })),
    [players]
  );
  const isPL = comp.slug === "premier-league";

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "1.9rem", fontWeight: 900, margin: "0 0 .25rem" }}>{comp.name} Stats</h1>
          <p style={{ color: "var(--muted)", margin: 0 }}>{seasonLabel(comp.currentSeason)} stat leaders.</p>
        </div>
        <LeagueSwitch />
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))" }}>
        {boards.map((b) => (
          <div key={b.key} className="card" style={{ padding: "1rem" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, margin: "0 0 .6rem" }}>{b.label}</h2>
            <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 2 }}>
              {b.rows.map((r, i) => {
                const inner = (
                  <>
                    <span style={{ width: 18, color: "var(--muted)", fontWeight: 700 }}>{i + 1}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.p.photo || plPhoto(r.p.id)} alt="" width={26} height={26} loading="lazy" style={{ borderRadius: "50%", background: "var(--panel-2)", objectFit: "cover" }} />
                    <span style={{ flex: 1, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.p.name}</span>
                    <strong style={{ color: "var(--accent)", minWidth: 28, textAlign: "right" }}>{r.v}</strong>
                  </>
                );
                return (
                  <li key={String(r.p.id)}>
                    {isPL ? (
                      <Link href={`/players/${r.p.id}/${slugify(r.p.name)}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px", borderRadius: 8 }}>{inner}</Link>
                    ) : (
                      <span style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px" }}>{inner}</span>
                    )}
                  </li>
                );
              })}
              {!loading && b.rows.length === 0 && <li style={{ color: "var(--muted)", fontSize: ".88rem", padding: 6 }}>No data.</li>}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
