import { getStandings } from "@/lib/local";
import { teamBadge } from "@/lib/api-client";
import type { Competition } from "@/lib/competitions";
import { seasonLabel } from "@/lib/competitions";

export default function StandingsTable({ comp }: { comp: Competition }) {
  const table = getStandings();

  return (
    <div className="card" style={{ overflowX: "auto" }}>
      <table className="stat">
        <thead>
          <tr>
            <th>#</th>
            <th>Club</th>
            <th>Pl</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            <th>GF</th>
            <th>GA</th>
            <th>GD</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {table.map((e) => {
            const gd = e.overall.goalsFor - e.overall.goalsAgainst;
            const move = e.overall.startingPosition - e.overall.position;
            return (
              <tr key={e.team.id}>
                <td>
                  {e.overall.position}{" "}
                  {move !== 0 && (
                    <span className={move > 0 ? "hl-up" : "hl-down"} style={{ fontSize: ".7rem" }}>
                      {move > 0 ? "▲" : "▼"}
                    </span>
                  )}
                </td>
                <td style={{ fontWeight: 600 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={teamBadge(e.team.id)} alt="" width={20} height={20} loading="lazy" />
                    {e.team.name}
                  </span>
                </td>
                <td>{e.overall.played}</td>
                <td>{e.overall.won}</td>
                <td>{e.overall.drawn}</td>
                <td>{e.overall.lost}</td>
                <td>{e.overall.goalsFor}</td>
                <td>{e.overall.goalsAgainst}</td>
                <td style={{ color: gd > 0 ? "var(--accent)" : gd < 0 ? "var(--danger)" : undefined }}>
                  {gd > 0 ? "+" : ""}
                  {gd}
                </td>
                <td style={{ fontWeight: 800 }}>{e.overall.points}</td>
              </tr>
            );
          })}
          {table.length === 0 && (
            <tr>
              <td colSpan={10} style={{ color: "var(--muted)" }}>
                No table yet for the {seasonLabel(comp.currentSeason)} season.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
