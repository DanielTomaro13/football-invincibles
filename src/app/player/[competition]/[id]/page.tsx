import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { COMPETITIONS, getCompetition, seasonLabel } from "@/lib/competitions";
import { pageMeta, SITE } from "@/lib/seo";
import { safeId } from "@/lib/ids";
import { playerIndex, fullPlayerId, notablePlayerIds, type PlayerEntry } from "@/lib/server-data";
import JsonLd from "@/components/JsonLd";
import AdUnit from "@/components/AdUnit";
import { AD_SLOTS } from "@/lib/ads";

type Params = Promise<{ competition: string; id: string }>;
const plPhoto = (id: string) => `https://resources.premierleague.com/premierleague25/photos/players/110x140/${id}.png`;
const POS_ABBR: Record<string, string> = { Goalkeeper: "GK", Defender: "DEF", Midfielder: "MID", Forward: "FWD" };

export function generateStaticParams() {
  const out: { competition: string; id: string }[] = [];
  for (const c of COMPETITIONS.filter((x) => x.enabled))
    for (const id of notablePlayerIds(c.dataPrefix)) out.push({ competition: c.slug, id: safeId(id) });
  return out;
}

function resolve(competition: string, id: string): { comp: ReturnType<typeof getCompetition>; full: string; entry: PlayerEntry } | null {
  const comp = getCompetition(competition);
  if (!comp) return null;
  const full = fullPlayerId(comp.dataPrefix, id);
  if (!full) return null;
  const entry = playerIndex(comp.dataPrefix)[full];
  return entry ? { comp, full, entry } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { competition, id } = await params;
  const r = resolve(competition, id);
  if (!r) return {};
  const tot = r.entry.s.reduce((a, s) => ({ g: a.g + s[4], a: a.a + s[5] }), { g: 0, a: 0 });
  return pageMeta({
    title: `${r.entry.n} — ${r.comp!.name} Career & Stats`,
    description: `${r.entry.n}: ${r.entry.s.length} ${r.comp!.name} seasons, ${tot.g} goals and ${tot.a} assists. Season-by-season appearances, goals, clean sheets and ratings.`,
    path: `/player/${competition}/${id}`,
    keywords: [r.entry.n, `${r.entry.n} stats`, `${r.entry.n} ${r.comp!.name}`],
  });
}

export default async function PlayerPage({ params }: { params: Params }) {
  const { competition, id } = await params;
  const r = resolve(competition, id);
  if (!r) notFound();
  const { comp, full, entry } = r;
  const photo = entry.ph || (comp!.slug === "premier-league" ? plPhoto(full) : "");
  const tot = entry.s.reduce((a, s) => ({ apps: a.apps + s[3], g: a.g + s[4], as: a.as + s[5], cs: a.cs + s[6] }), { apps: 0, g: 0, as: 0, cs: 0 });
  const best = entry.s.reduce((m, s) => Math.max(m, s[8] ?? 0), 0);
  const isGK = entry.p === "Goalkeeper";
  const ld = [
    { "@context": "https://schema.org", "@type": "Person", name: entry.n, nationality: entry.na, jobTitle: "Professional footballer", image: photo || undefined, url: `${SITE.url}/player/${competition}/${id}` },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
      { "@type": "ListItem", position: 2, name: `${comp!.name} Players`, item: `${SITE.url}/players` },
      { "@type": "ListItem", position: 3, name: entry.n },
    ] },
  ];

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <JsonLd data={ld} />
      <div className="card" style={{ padding: "1.5rem", display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt={entry.n} width={92} height={116} loading="lazy" style={{ borderRadius: 12, background: "var(--panel-2)", objectFit: "cover" }} />
        <div style={{ display: "grid", gap: 6 }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: 0 }}>{entry.n}</h1>
          <div style={{ color: "var(--muted)" }}>
            <span className="chip" style={{ marginRight: 8 }}>{POS_ABBR[entry.p] || entry.p}</span>
            {entry.na && <span>{entry.na} · </span>}{comp!.name}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))" }}>
        {[{ l: "Seasons", v: entry.s.length }, { l: "Apps", v: tot.apps }, { l: isGK ? "Clean sheets" : "Goals", v: isGK ? tot.cs : tot.g }, { l: isGK ? "Goals" : "Assists", v: isGK ? tot.g : tot.as }, { l: "Peak rating", v: best || "—" }].map((s) => (
          <div key={s.l} className="card" style={{ padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--accent)" }}>{s.v}</div>
            <div style={{ color: "var(--muted)", fontSize: ".78rem", textTransform: "uppercase" }}>{s.l}</div>
          </div>
        ))}
      </div>

      <AdUnit slot={AD_SLOTS.article} />

      <section>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: "0 0 8px" }}>{comp!.name} — season by season</h2>
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="stat" style={{ minWidth: 460 }}>
            <thead><tr><th>Season</th><th>Club</th><th style={{ textAlign: "center" }}>Apps</th><th style={{ textAlign: "center" }}>G</th><th style={{ textAlign: "center" }}>A</th><th style={{ textAlign: "center" }}>CS</th><th style={{ textAlign: "center" }}>Rating</th></tr></thead>
            <tbody>
              {entry.s.map((s, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{seasonLabel(s[0])}</td>
                  <td><Link href={`/club/${comp!.slug}/${safeId(s[1])}`} style={{ color: "var(--accent)", fontWeight: 600 }}>{s[2]}</Link></td>
                  <td style={{ textAlign: "center" }}>{s[3]}</td><td style={{ textAlign: "center" }}>{s[4]}</td><td style={{ textAlign: "center" }}>{s[5]}</td><td style={{ textAlign: "center" }}>{s[6]}</td>
                  <td style={{ textAlign: "center", fontWeight: 800, color: "var(--accent)" }}>{s[8] ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
