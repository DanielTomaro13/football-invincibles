import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPlayerCareer, getPlayerSeasonStats, playerPhoto, teamBadge } from "@/lib/api";
import { DEFAULT_COMPETITION, seasonLabel } from "@/lib/competitions";
import { pageMeta } from "@/lib/seo";
import { ageFromDob } from "@/lib/format";
import JsonLd from "@/components/JsonLd";

export const revalidate = 86400;

type Params = Promise<{ id: string; slug: string }>;

async function load(id: string) {
  const career = await getPlayerCareer(id);
  if (!career.length) return null;
  const latest = career[career.length - 1];
  return { career, latest };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id, slug } = await params;
  const data = await load(id);
  if (!data) return {};
  const name = data.latest.name?.display ?? "Player";
  const team = data.latest.currentTeam?.name ?? "";
  const pos = data.latest.position ?? "";
  return pageMeta({
    title: `${name} — ${team} ${pos} Profile & Stats`,
    description: `${name}, ${pos} for ${team}. Premier League profile: nationality, age, shirt number and season stats.`,
    path: `/players/${id}/${slug}`,
    image: playerPhoto(id, "250x250"),
    keywords: [name, `${name} stats`, `${name} ${team}`],
  });
}

export default async function PlayerPage({ params }: { params: Params }) {
  const { id } = await params;
  const data = await load(id);
  if (!data) notFound();
  const p = data.latest;
  const c = DEFAULT_COMPETITION;
  const stats = await getPlayerSeasonStats(c.sdpId, c.currentSeason, id);
  const name = p.name?.display ?? "Player";
  const age = ageFromDob(p.dates?.birth);

  const lines: { label: string; value: string | number }[] = [
    { label: "Club", value: p.currentTeam?.name ?? "—" },
    { label: "Position", value: p.position ?? "—" },
    { label: "Nationality", value: p.country?.country ?? "—" },
    { label: "Age", value: age ?? "—" },
    { label: "Shirt", value: p.shirtNum ?? "—" },
    { label: "Height", value: p.height ? `${p.height} cm` : "—" },
    { label: "Foot", value: p.preferredFoot ?? "—" },
  ];

  const statRows: { label: string; key: string }[] = [
    { label: "Appearances", key: "appearances" },
    { label: "Goals", key: "goals" },
    { label: "Assists", key: "goalAssists" },
    { label: "Shots", key: "totalShots" },
    { label: "Passes", key: "totalPasses" },
    { label: "Clean sheets", key: "cleanSheets" },
    { label: "Yellow cards", key: "yellowCards" },
  ];

  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    nationality: p.country?.country,
    jobTitle: "Professional footballer",
    affiliation: p.currentTeam?.name,
    image: playerPhoto(id, "250x250"),
  };

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <JsonLd data={personLd} />
      <div className="card" style={{ padding: "1.5rem", display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={playerPhoto(id, "250x250")}
          alt={name}
          width={120}
          height={150}
          style={{ borderRadius: 14, background: "var(--panel-2)", objectFit: "cover" }}
        />
        <div style={{ display: "grid", gap: 6 }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: 0 }}>{name}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)" }}>
            {p.currentTeam?.id && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={teamBadge(p.currentTeam.id)} alt="" width={22} height={22} />
            )}
            {p.currentTeam?.name} · {p.position}
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

        <section className="card" style={{ padding: "1rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 800, marginTop: 0 }}>
            {seasonLabel(c.currentSeason)} stats
          </h2>
          <table className="stat">
            <tbody>
              {statRows.map((s) => (
                <tr key={s.key}>
                  <td style={{ color: "var(--muted)" }}>{s.label}</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>
                    {stats[s.key] != null ? Math.round(stats[s.key]) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {Object.keys(stats).length === 0 && (
            <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>No stats recorded this season.</p>
          )}
        </section>
      </div>
    </div>
  );
}
