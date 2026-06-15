import type { Metadata } from "next";
import Link from "next/link";
import { COMPETITIONS } from "@/lib/competitions";
import { pageMeta } from "@/lib/seo";
import { safeId } from "@/lib/ids";
import { teamIndex } from "@/lib/server-data";

export const metadata: Metadata = pageMeta({
  title: "Clubs — Premier League, LaLiga & Serie A",
  description: "Every club across the Premier League, LaLiga and Serie A — seasons played, titles won and best finishes, with full season-by-season records and squads.",
  path: "/clubs",
  keywords: ["football clubs", "premier league clubs", "serie a clubs", "laliga clubs", "club history"],
});

export default function ClubsPage() {
  return (
    <div style={{ display: "grid", gap: "2rem" }}>
      <div>
        <h1 style={{ fontSize: "1.9rem", fontWeight: 900, margin: "0 0 .25rem" }}>Clubs</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>Every club we cover, across all three leagues. Tap any club for its full season-by-season record and squads.</p>
      </div>
      {COMPETITIONS.filter((c) => c.enabled).map((c) => {
        const teams = Object.entries(teamIndex(c.dataPrefix))
          .map(([id, t]) => ({ id, ...t, titles: t.s.filter((s) => s[1] === 1).length }))
          .sort((a, b) => a.n.localeCompare(b.n));
        return (
          <section key={c.slug}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0 }}>{c.badge} {c.name}</h2>
              <Link href={`/tables/${c.slug}`} style={{ color: "var(--accent)", fontSize: ".9rem", fontWeight: 600 }}>Table →</Link>
            </div>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))" }}>
              {teams.map((t) => (
                <Link key={t.id} href={`/club/${c.slug}/${safeId(t.id)}`} className="card" style={{ padding: ".8rem", display: "flex", gap: 10, alignItems: "center" }}>
                  {t.b && /* eslint-disable-next-line @next/next/no-img-element */ <img src={t.b} alt="" width={32} height={32} loading="lazy" style={{ objectFit: "contain" }} />}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.n}</div>
                    <div style={{ color: "var(--muted)", fontSize: ".8rem" }}>{t.s.length} seasons{t.titles ? ` · 🏆 ${t.titles}` : ""}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
