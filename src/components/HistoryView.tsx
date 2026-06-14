"use client";
import { useEffect, useMemo, useState } from "react";
import { useCompetition } from "@/components/CompetitionProvider";
import { seasonLabel } from "@/lib/competitions";
import { loadSeasonStandings, loadSeasonRosters, loadHistoryIndex, type HistPlayer } from "@/lib/history";
import LeagueSwitch from "@/components/LeagueSwitch";

/**
 * Historical archive: pick any past season of the active league and see its
 * final league table plus that season's highest-rated XI (from the same ratings
 * the Invincibles game uses). Competition-aware via the global league switch.
 */
const POS_ORDER: Record<string, number> = { Goalkeeper: 0, Defender: 1, Midfielder: 2, Forward: 3 };
const POS_ABBR: Record<string, string> = { Goalkeeper: "GK", Defender: "DEF", Midfielder: "MID", Forward: "FWD" };

export default function HistoryView() {
  const { comp } = useCompetition();
  const [year, setYear] = useState(comp.currentSeason);
  const [table, setTable] = useState<any[] | null>(null);
  const [top, setTop] = useState<{ p: HistPlayer; team: string }[]>([]);

  // keep the selected year valid when the league changes
  useEffect(() => {
    if (!comp.seasons.includes(year)) setYear(comp.currentSeason);
  }, [comp.slug, comp.currentSeason, comp.seasons, year]);

  useEffect(() => {
    let alive = true;
    setTable(null);
    setTop([]);
    Promise.all([
      loadSeasonStandings(year, comp.dataPrefix),
      loadSeasonRosters(year, comp.dataPrefix).catch(() => ({})),
      loadHistoryIndex(comp.dataPrefix).catch(() => null),
    ]).then(([st, rosters, idx]) => {
      if (!alive) return;
      setTable(st);
      const names = new Map<string, string>();
      const seasonTeams = idx?.seasons?.find((s: any) => s.year === year)?.teams ?? [];
      for (const t of seasonTeams) names.set(String(t.id), t.short || t.name);
      const all: { p: HistPlayer; team: string }[] = [];
      for (const [tid, list] of Object.entries(rosters as Record<string, HistPlayer[]>))
        for (const p of list) all.push({ p, team: names.get(String(tid)) || "" });
      all.sort((a, b) => (b.p.rating ?? 0) - (a.p.rating ?? 0));
      setTop(all.slice(0, 11).sort((a, b) => (POS_ORDER[a.p.pos] ?? 9) - (POS_ORDER[b.p.pos] ?? 9) || (b.p.rating ?? 0) - (a.p.rating ?? 0)));
    });
    return () => { alive = false; };
  }, [year, comp.dataPrefix]);

  const champion = table?.[0]?.team?.name;

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "1.9rem", fontWeight: 900, margin: "0 0 .25rem" }}>{comp.name} — Season Archive</h1>
          <p style={{ color: "var(--muted)", margin: 0 }}>
            Final tables and the top-rated XI for every season we cover.
          </p>
        </div>
        <LeagueSwitch compact />
      </div>

      {/* season picker */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ color: "var(--muted)", fontSize: ".9rem" }}>Season</label>
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          style={{ minHeight: 40, padding: "0 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)", fontWeight: 700, fontFamily: "inherit", fontSize: "1rem" }}
        >
          {comp.seasons.map((s) => (
            <option key={s} value={s}>{seasonLabel(s)}</option>
          ))}
        </select>
        {champion && <span className="chip" style={{ color: "var(--gold)" }}>🏆 {champion}</span>}
      </div>

      <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", alignItems: "start" }}>
        {/* final table */}
        <section>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: "0 0 8px" }}>Final table · {seasonLabel(year)}</h2>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {table === null ? (
              <div style={{ padding: "1rem", color: "var(--muted)" }}>Loading…</div>
            ) : table.length === 0 ? (
              <div style={{ padding: "1rem", color: "var(--muted)" }}>No table stored for this season.</div>
            ) : (
              <table className="stat" style={{ fontSize: ".88rem" }}>
                <thead>
                  <tr><th style={{ width: 28 }}>#</th><th>Club</th><th style={{ textAlign: "center" }}>P</th><th style={{ textAlign: "center" }}>W</th><th style={{ textAlign: "center" }}>D</th><th style={{ textAlign: "center" }}>L</th><th style={{ textAlign: "center" }}>GD</th><th style={{ textAlign: "center" }}>Pts</th></tr>
                </thead>
                <tbody>
                  {table.map((e) => {
                    const o = e.overall;
                    return (
                      <tr key={e.team.id}>
                        <td style={{ fontWeight: 700, color: o.position === 1 ? "var(--gold)" : "var(--muted)" }}>{o.position}</td>
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            {e.team.badge && /* eslint-disable-next-line @next/next/no-img-element */ <img src={e.team.badge} alt="" width={16} height={16} loading="lazy" onError={(ev) => { (ev.target as HTMLImageElement).style.visibility = "hidden"; }} />}
                            {e.team.shortName || e.team.name}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>{o.played}</td>
                        <td style={{ textAlign: "center" }}>{o.won}</td>
                        <td style={{ textAlign: "center" }}>{o.drawn}</td>
                        <td style={{ textAlign: "center" }}>{o.lost}</td>
                        <td style={{ textAlign: "center" }}>{o.goalsFor - o.goalsAgainst}</td>
                        <td style={{ textAlign: "center", fontWeight: 800 }}>{o.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* top-rated XI */}
        <section>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: "0 0 8px" }}>Top-rated XI · {seasonLabel(year)}</h2>
          <div className="card" style={{ padding: ".5rem 0" }}>
            {top.length === 0 ? (
              <div style={{ padding: "1rem", color: "var(--muted)" }}>{table === null ? "Loading…" : "No player ratings for this season."}</div>
            ) : (
              <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {top.map(({ p, team }) => (
                  <li key={String(p.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: ".5rem 1rem", borderBottom: "1px solid var(--border)" }}>
                    <span className="chip" style={{ minWidth: 42, justifyContent: "center" }}>{POS_ABBR[p.pos] || p.pos}</span>
                    <span style={{ flex: 1, fontWeight: 600 }}>{p.name}</span>
                    <span style={{ color: "var(--muted)", fontSize: ".82rem" }}>{team}</span>
                    <strong style={{ color: "var(--accent)", minWidth: 34, textAlign: "right" }}>{p.rating}</strong>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
