import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allPlayers, getPlayer, SEASON } from "@/lib/local";
import { playerPhoto, teamBadge } from "@/lib/api-client";
import { seasonLabel } from "@/lib/competitions";
import { pageMeta } from "@/lib/seo";
import { ageFromDob } from "@/lib/format";
import JsonLd from "@/components/JsonLd";

type Params = Promise<{ id: string; slug: string }>;

export function generateStaticParams() {
  return allPlayers().map((p) => ({ id: String(p.id), slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id, slug } = await params;
  const p = getPlayer(id);
  if (!p) return {};
  const team = p.team?.name ?? "";
  return pageMeta({
    title: `${p.name} — ${team} ${p.position ?? ""} Profile & Stats`,
    description: `${p.name}, ${p.position} for ${team}. Premier League profile: nationality, age, shirt number and season stats.`,
    path: `/players/${id}/${slug}`,
    image: playerPhoto(id, "250x250"),
    keywords: [p.name, `${p.name} stats`, `${p.name} ${team}`],
  });
}


export default async function PlayerPage({ params }: { params: Params }) {
  const { id } = await params;
  const p = getPlayer(id);
  if (!p) notFound();
  const age = ageFromDob(p.birth);

  const lines: { label: string; value: string | number }[] = [
    { label: "Club", value: p.team?.name ?? "—" },
    { label: "Position", value: p.position ?? "—" },
    { label: "Nationality", value: p.country ?? "—" },
    { label: "Age", value: age ?? "—" },
    { label: "Shirt", value: p.shirtNum ?? "—" },
    { label: "Height", value: p.height ? `${p.height} cm` : "—" },
    { label: "Foot", value: p.preferredFoot ?? "—" },
  ];

  const val = (keys: string[], dec = 0): string | null => {
    for (const k of keys) if (p.stats[k] != null) return p.stats[k].toFixed(dec);
    return null;
  };
  const STAT_GROUPS: { title: string; rows: { label: string; keys: string[]; dec?: number }[] }[] = [
    {
      title: "Attacking",
      rows: [
        { label: "Goals", keys: ["goals"] },
        { label: "Assists", keys: ["goalAssists", "goal_assists"] },
        { label: "Shots", keys: ["totalShots", "total_shots"] },
        { label: "Shots on target", keys: ["shotsOnTargetIncGoals"] },
        { label: "Chances created", keys: ["keyPassesAttemptAssists"] },
        { label: "Headed goals", keys: ["headedGoals"] },
        { label: "Penalty goals", keys: ["penaltyGoals"] },
        { label: "Hit woodwork", keys: ["hitWoodwork"] },
        { label: "Offsides", keys: ["offsides"] },
      ],
    },
    {
      title: "Passing & possession",
      rows: [
        { label: "Passes", keys: ["totalPasses", "total_passes"] },
        { label: "Forward passes", keys: ["forwardPasses"] },
        { label: "Successful crosses", keys: ["successfulCrossesOpenPlay"] },
        { label: "Through balls", keys: ["throughBalls"] },
        { label: "Duels won", keys: ["duelsWon"] },
        { label: "Successful dribbles", keys: ["successfulDribbles"] },
      ],
    },
    {
      title: "Defending",
      rows: [
        { label: "Tackles won", keys: ["tacklesWon"] },
        { label: "Total tackles", keys: ["totalTackles"] },
        { label: "Interceptions", keys: ["interceptions"] },
        { label: "Clearances", keys: ["totalClearances"] },
        { label: "Blocks", keys: ["blocks", "blockedShots"] },
        { label: "Recoveries", keys: ["recoveries"] },
        { label: "Aerial duels won", keys: ["aerialDuelsWon"] },
      ],
    },
    {
      title: "Goalkeeping",
      rows: [
        { label: "Clean sheets", keys: ["cleanSheets", "clean_sheets"] },
        { label: "Saves", keys: ["savesMade"] },
        { label: "Saves from penalty", keys: ["savesFromPenalty"] },
        { label: "Goals conceded", keys: ["goalsConceded"] },
        { label: "Penalties saved", keys: ["penaltiesSaved"] },
      ],
    },
    {
      title: "Appearances & discipline",
      rows: [
        { label: "Appearances", keys: ["appearances"] },
        { label: "Minutes", keys: ["timePlayed"] },
        { label: "Yellow cards", keys: ["yellowCards"] },
        { label: "Red cards", keys: ["totalRedCards", "straightRedCards"] },
        { label: "Fouls conceded", keys: ["totalFoulsConceded"] },
        { label: "Penalties won", keys: ["foulWonPenalty"] },
      ],
    },
  ];
  const groups = STAT_GROUPS.map((g) => ({
    title: g.title,
    rows: g.rows.map((r) => ({ label: r.label, value: val(r.keys, r.dec) })).filter((r) => r.value != null),
  })).filter((g) => g.rows.length);

  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: p.name,
    nationality: p.country,
    jobTitle: "Professional footballer",
    affiliation: p.team?.name,
    image: playerPhoto(id, "250x250"),
  };

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <JsonLd data={personLd} />
      <div className="card" style={{ padding: "1.5rem", display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={playerPhoto(id, "250x250")}
          alt={p.name}
          width={120}
          height={150}
          style={{ borderRadius: 14, background: "var(--panel-2)", objectFit: "cover" }}
        />
        <div style={{ display: "grid", gap: 6 }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: 0 }}>{p.name}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)" }}>
            {p.team?.id && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={teamBadge(p.team.id)} alt="" width={22} height={22} />
            )}
            {p.team?.name} · {p.position}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
        <section className="card" style={{ padding: "1rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 800, marginTop: 0 }}>Profile</h2>
          <table className="stat">
            <tbody>
              {lines.map((l) => (
                <tr key={l.label}>
                  <td style={{ color: "var(--muted)" }}>{l.label}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{l.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {groups.map((g) => (
          <section key={g.title} className="card" style={{ padding: "1rem" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, marginTop: 0 }}>{g.title}</h2>
            <table className="stat">
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.label}>
                    <td style={{ color: "var(--muted)" }}>{r.label}</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
      {groups.length === 0 && <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>No {seasonLabel(SEASON)} stats recorded for this player.</p>}
    </div>
  );
}
