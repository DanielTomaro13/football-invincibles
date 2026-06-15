import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { COMPETITIONS, getCompetition } from "@/lib/competitions";
import { pageMeta, SITE } from "@/lib/seo";
import { safeId } from "@/lib/ids";
import { matchFile, listMatchIds, teamIndex, notablePlayerIds } from "@/lib/server-data";
import JsonLd from "@/components/JsonLd";
import AdUnit from "@/components/AdUnit";
import { AD_SLOTS } from "@/lib/ads";

type Params = Promise<{ competition: string; id: string }>;
const EV_ICON: Record<string, string> = { goal: "⚽", pen: "⚽", og: "⚽", yellow: "🟨", red: "🟥" };

export function generateStaticParams() {
  const out: { competition: string; id: string }[] = [];
  for (const c of COMPETITIONS.filter((x) => x.enabled))
    for (const id of listMatchIds(c.dataPrefix)) out.push({ competition: c.slug, id });
  return out;
}

function resolve(competition: string, id: string) {
  const comp = getCompetition(competition);
  if (!comp) return null;
  const m = matchFile(comp.dataPrefix, id);
  return m ? { comp, m } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { competition, id } = await params;
  const r = resolve(competition, id);
  if (!r) return {};
  const { comp, m } = r;
  return pageMeta({
    title: `${m.home.name} ${m.home.score}-${m.away.score} ${m.away.name} — ${comp!.name} Match`,
    description: `${m.home.name} ${m.home.score}-${m.away.score} ${m.away.name}, ${comp!.name} matchweek ${m.mw}. Lineups, ${m.events.length ? "goals, cards" : "team stats"} and full match detail.`,
    path: `/match/${competition}/${id}`,
    keywords: [`${m.home.name} ${m.away.name}`, `${comp!.name} ${m.home.name}`, "lineups", "match stats"],
  });
}

export default async function MatchPage({ params }: { params: Params }) {
  const { competition, id } = await params;
  const r = resolve(competition, id);
  if (!r) notFound();
  const { comp, m } = r;
  const badges = teamIndex(comp!.dataPrefix);
  const badge = (tid: string) => badges[tid]?.b || "";
  const slug = comp!.slug;
  const hasPage = new Set(notablePlayerIds(comp!.dataPrefix));
  const ld = [
    { "@context": "https://schema.org", "@type": "SportsEvent", name: `${m.home.name} vs ${m.away.name}`, sport: "Association football", startDate: m.date || undefined, ...(m.ground ? { location: { "@type": "Place", name: m.ground } } : {}), competitor: [{ "@type": "SportsTeam", name: m.home.name }, { "@type": "SportsTeam", name: m.away.name }], url: `${SITE.url}/match/${competition}/${id}` },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
      { "@type": "ListItem", position: 2, name: `${comp!.name} Fixtures`, item: `${SITE.url}/matches` },
      { "@type": "ListItem", position: 3, name: `${m.home.name} ${m.home.score}-${m.away.score} ${m.away.name}` },
    ] },
  ];

  const TeamHead = ({ side, align }: { side: any; align: "flex-start" | "flex-end" }) => (
    <Link href={`/club/${slug}/${safeId(side.id)}`} style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: align, fontWeight: 800 }}>
      {align === "flex-start" && badge(side.id) && /* eslint-disable-next-line @next/next/no-img-element */ <img src={badge(side.id)} alt="" width={28} height={28} />}
      <span>{side.name}</span>
      {align === "flex-end" && badge(side.id) && /* eslint-disable-next-line @next/next/no-img-element */ <img src={badge(side.id)} alt="" width={28} height={28} />}
    </Link>
  );
  const PlayerList = ({ players, muted }: { players: any[]; muted?: boolean }) => (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 1 }}>
      {players.map((p: any) => {
        const st = { display: "flex", alignItems: "center", gap: 8, padding: "3px 2px", color: muted ? "var(--muted)" : "var(--text)" } as const;
        const inner = (<>
          <span style={{ width: 22, textAlign: "right", color: "var(--muted)", flexShrink: 0 }}>{p.num ?? ""}</span>
          <span style={{ fontWeight: 600 }}>{p.name}</span>
          {p.cap && <span title="Captain" style={{ fontSize: ".65rem", color: "var(--gold)" }}>(C)</span>}
        </>);
        return <li key={p.id}>{hasPage.has(String(p.id)) ? <Link href={`/player/${slug}/${safeId(p.id)}`} style={st}>{inner}</Link> : <span style={st}>{inner}</span>}</li>;
      })}
    </ul>
  );

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <JsonLd data={ld} />
      <Link href="/matches" style={{ color: "var(--accent)", fontSize: ".88rem" }}>← Fixtures</Link>

      <div className="card" style={{ padding: "1.25rem", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12 }}>
        <TeamHead side={m.home} align="flex-end" />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{m.home.score} – {m.away.score}</div>
          <div style={{ color: "var(--muted)", fontSize: ".75rem" }}>MW {m.mw}{m.ground ? ` · ${m.ground}` : ""}</div>
        </div>
        <TeamHead side={m.away} align="flex-start" />
      </div>

      {m.events.length > 0 && (
        <section>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 8px" }}>Timeline</h2>
          <div className="card" style={{ padding: ".5rem 0" }}>
            {m.events.map((e: any, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: ".35rem 1rem", flexDirection: e.team === "away" ? "row-reverse" : "row", textAlign: e.team === "away" ? "right" : "left" }}>
                <span style={{ width: 34, color: "var(--muted)", fontWeight: 700, flexShrink: 0 }}>{e.min}&apos;</span>
                <span style={{ flexShrink: 0 }}>{EV_ICON[e.type] || "•"}</span>
                <span style={{ flex: 1, fontWeight: 600 }}>{e.player}{e.type === "pen" ? " (pen)" : e.type === "og" ? " (OG)" : ""}{e.assist ? <span style={{ color: "var(--muted)", fontWeight: 400 }}> · {e.assist}</span> : null}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {m.stats.length > 0 && (
        <section>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 8px" }}>Match stats</h2>
          <div className="card" style={{ padding: "1rem", display: "grid", gap: 12 }}>
            {m.stats.map((s: any) => {
              const tot = s.home + s.away || 1;
              const hp = s.pct ? s.home : Math.round((s.home / tot) * 100);
              return (
                <div key={s.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".82rem", marginBottom: 3 }}>
                    <strong>{s.home}{s.pct ? "%" : ""}</strong><span style={{ color: "var(--muted)" }}>{s.label}</span><strong>{s.away}{s.pct ? "%" : ""}</strong>
                  </div>
                  <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: "var(--panel-2)" }}>
                    <div style={{ width: `${hp}%`, background: "var(--accent)" }} /><div style={{ width: `${100 - hp}%`, background: "var(--accent-2)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <AdUnit slot={AD_SLOTS.article} />

      <section>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 8px" }}>Lineups</h2>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
          {[m.home, m.away].map((side: any) => (
            <div key={side.id} className="card" style={{ padding: "1rem" }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>{side.name} {side.formation && <span style={{ color: "var(--muted)", fontWeight: 600, fontSize: ".85rem" }}>· {side.formation}</span>}</div>
              <PlayerList players={side.xi} />
              {side.bench.length > 0 && <>
                <div style={{ color: "var(--muted)", fontSize: ".75rem", textTransform: "uppercase", margin: "10px 0 4px" }}>Bench</div>
                <PlayerList players={side.bench} muted />
              </>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
