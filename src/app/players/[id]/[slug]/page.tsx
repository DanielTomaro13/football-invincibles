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

const num = (stats: Record<string, number>, ...keys: string[]) => {
  for (const k of keys) if (stats[k] != null) return Math.round(stats[k]);
  return null;
};

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

  const statRows: { label: string; keys: string[] }[] = [
    { label: "Appearances", keys: ["appearances"] },
    { label: "Goals", keys: ["goals"] },
    { label: "Assists", keys: ["goalAssists", "goal_assists"] },
    { label: "Shots", keys: ["totalShots", "total_shots"] },
    { label: "Passes", keys: ["totalPasses", "total_passes"] },
    { label: "Clean sheets", keys: ["cleanSheets", "clean_sheets"] },
    { label: "Yellow cards", keys: ["yellowCards"] },
  ];
  const hasStats = statRows.some((s) => num(p.stats, ...s.keys) != null);

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

        <section className="card" style={{ padding: "1rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 800, marginTop: 0 }}>
            {seasonLabel(SEASON)} stats
          </h2>
          <table className="stat">
            <tbody>
              {statRows.map((s) => (
                <tr key={s.label}>
                  <td style={{ color: "var(--muted)" }}>{s.label}</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{num(p.stats, ...s.keys) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!hasStats && <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>No stats recorded this season.</p>}
        </section>
      </div>
    </div>
  );
}
