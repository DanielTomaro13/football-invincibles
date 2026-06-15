import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { COMPETITIONS, getCompetition, seasonLabel } from "@/lib/competitions";
import { pageMeta, SITE } from "@/lib/seo";
import { safeId } from "@/lib/ids";
import { teamIndex, fullTeamId, type TeamEntry } from "@/lib/server-data";
import ClubSquad from "@/components/ClubSquad";
import JsonLd from "@/components/JsonLd";

type Params = Promise<{ competition: string; id: string }>;

export function generateStaticParams() {
  const out: { competition: string; id: string }[] = [];
  for (const c of COMPETITIONS.filter((x) => x.enabled))
    for (const id of Object.keys(teamIndex(c.dataPrefix))) out.push({ competition: c.slug, id: safeId(id) });
  return out;
}

function resolve(competition: string, id: string): { comp: ReturnType<typeof getCompetition>; full: string; entry: TeamEntry } | null {
  const comp = getCompetition(competition);
  if (!comp) return null;
  const full = fullTeamId(comp.dataPrefix, id);
  if (!full) return null;
  const entry = teamIndex(comp.dataPrefix)[full];
  return entry ? { comp, full, entry } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { competition, id } = await params;
  const r = resolve(competition, id);
  if (!r) return {};
  return pageMeta({
    title: `${r.entry.n} — ${r.comp!.name} Seasons, Tables & Squads`,
    description: `${r.entry.n} in the ${r.comp!.name}: ${r.entry.s.length} seasons of final league positions, points and squads.`,
    path: `/club/${competition}/${id}`,
    keywords: [r.entry.n, `${r.entry.n} ${r.comp!.name}`, `${r.entry.n} squad`, `${r.entry.n} table`],
  });
}

export default async function ClubPage({ params }: { params: Params }) {
  const { competition, id } = await params;
  const r = resolve(competition, id);
  if (!r) notFound();
  const { comp, full, entry } = r;
  const titles = entry.s.filter((s) => s[1] === 1).length;
  const best = Math.min(...entry.s.map((s) => s[1]));
  const years = entry.s.map((s) => s[0]);
  const ld = [
    { "@context": "https://schema.org", "@type": "SportsTeam", name: entry.n, sport: "Association football", memberOf: { "@type": "SportsOrganization", name: comp!.name }, logo: entry.b || undefined, url: `${SITE.url}/club/${competition}/${id}` },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
      { "@type": "ListItem", position: 2, name: `${comp!.name} Clubs`, item: `${SITE.url}/clubs` },
      { "@type": "ListItem", position: 3, name: entry.n },
    ] },
  ];

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <JsonLd data={ld} />
      <div className="card" style={{ padding: "1.5rem", display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
        {entry.b && /* eslint-disable-next-line @next/next/no-img-element */ <img src={entry.b} alt="" width={64} height={64} style={{ objectFit: "contain" }} />}
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: 0 }}>{entry.n}</h1>
          <div style={{ color: "var(--muted)" }}>{comp!.name} · {entry.s.length} seasons{titles ? ` · 🏆 ${titles} title${titles > 1 ? "s" : ""}` : ""} · best finish #{best}</div>
        </div>
      </div>

      <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", alignItems: "start" }}>
        <section>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: "0 0 8px" }}>League finishes</h2>
          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <table className="stat" style={{ minWidth: 380 }}>
              <thead><tr><th>Season</th><th style={{ textAlign: "center" }}>Pos</th><th style={{ textAlign: "center" }}>P</th><th style={{ textAlign: "center" }}>W</th><th style={{ textAlign: "center" }}>D</th><th style={{ textAlign: "center" }}>L</th><th style={{ textAlign: "center" }}>GD</th><th style={{ textAlign: "center" }}>Pts</th></tr></thead>
              <tbody>
                {entry.s.map((s) => (
                  <tr key={s[0]}>
                    <td style={{ fontWeight: 600 }}>{seasonLabel(s[0])}</td>
                    <td style={{ textAlign: "center", fontWeight: 800, color: s[1] === 1 ? "var(--gold)" : "var(--text)" }}>{s[1] === 1 ? "🏆" : s[1]}</td>
                    <td style={{ textAlign: "center" }}>{s[2]}</td><td style={{ textAlign: "center" }}>{s[3]}</td><td style={{ textAlign: "center" }}>{s[4]}</td><td style={{ textAlign: "center" }}>{s[5]}</td>
                    <td style={{ textAlign: "center" }}>{s[6] - s[7]}</td><td style={{ textAlign: "center", fontWeight: 800 }}>{s[8]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <ClubSquad compSlug={comp!.slug} teamId={full} years={years} />
      </div>
    </div>
  );
}
