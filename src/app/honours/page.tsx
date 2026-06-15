import type { Metadata } from "next";
import Link from "next/link";
import { COMPETITIONS, seasonLabel } from "@/lib/competitions";
import { pageMeta } from "@/lib/seo";
import { safeId } from "@/lib/ids";
import { teamIndex } from "@/lib/server-data";
import LeaguePanes from "@/components/LeaguePanes";

export const metadata: Metadata = pageMeta({
  title: "Roll of Honour — League Champions by Season",
  description: "Every league champion by season across the Premier League, LaLiga and Serie A, plus the all-time title tally for each club.",
  path: "/honours",
  keywords: ["league champions", "premier league winners", "serie a scudetto winners", "laliga champions", "title winners by season"],
});

export default function HonoursPage() {
  const panes = COMPETITIONS.filter((c) => c.enabled).map((c) => {
    const node = (() => {
        const teams = teamIndex(c.dataPrefix);
        // year -> champion team id, and title tally
        const champOf: Record<string, string> = {};
        const titles: Record<string, number> = {};
        for (const [id, t] of Object.entries(teams))
          for (const s of t.s) if (s[1] === 1) { champOf[s[0]] = id; titles[id] = (titles[id] || 0) + 1; }
        const seasons = Object.keys(champOf).sort((a, b) => Number(b) - Number(a));
        const tally = Object.entries(titles).map(([id, n]) => ({ id, n, name: teams[id].sh, badge: teams[id].b })).sort((a, b) => b.n - a.n);

        return (
          <section key={c.slug}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: "0 0 12px" }}>{c.badge} {c.name} <span style={{ color: "var(--muted)", fontWeight: 600, fontSize: ".85rem" }}>· {seasons.length} titles listed</span></h2>
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)" }}>
              {/* champions by season */}
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {seasons.map((y) => {
                    const t = teams[champOf[y]];
                    return (
                      <li key={y} style={{ display: "flex", alignItems: "center", gap: 10, padding: ".5rem 1rem", borderBottom: "1px solid var(--border)" }}>
                        <span style={{ width: 60, color: "var(--muted)", fontWeight: 700, flexShrink: 0 }}>{seasonLabel(y)}</span>
                        <span style={{ flexShrink: 0 }}>🏆</span>
                        <Link href={`/club/${c.slug}/${safeId(champOf[y])}`} style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700, minWidth: 0 }}>
                          {t.b && /* eslint-disable-next-line @next/next/no-img-element */ <img src={t.b} alt="" width={20} height={20} loading="lazy" style={{ objectFit: "contain" }} />}
                          {t.n}
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </div>
              {/* title tally */}
              <div className="card" style={{ padding: "1rem", alignSelf: "start" }}>
                <h3 style={{ margin: "0 0 .6rem", fontSize: "1rem" }}>Most titles</h3>
                <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 4 }}>
                  {tally.map((t) => (
                    <li key={t.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Link href={`/club/${c.slug}/${safeId(t.id)}`} style={{ flex: 1, minWidth: 0, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</Link>
                      <strong style={{ color: "var(--gold)" }}>{"🏆".repeat(Math.min(t.n, 3))} {t.n}</strong>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <p style={{ color: "var(--muted)", fontSize: ".78rem", margin: "8px 2px 0" }}>Within the seasons we cover ({seasonLabel(c.seasons[c.seasons.length - 1])}–{seasonLabel(c.seasons[0])}).</p>
          </section>
        );
    })();
    return { slug: c.slug, node };
  });

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div>
        <h1 style={{ fontSize: "1.9rem", fontWeight: 900, margin: "0 0 .25rem" }}>Roll of Honour</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>League champions season by season, and the all-time title count per club.</p>
      </div>
      <LeaguePanes panes={panes} />
    </div>
  );
}
