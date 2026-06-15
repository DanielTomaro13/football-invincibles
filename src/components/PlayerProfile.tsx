"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getCompetition, seasonLabel } from "@/lib/competitions";

const plPhoto = (id: string) => `https://resources.premierleague.com/premierleague25/photos/players/110x140/${id}.png`;
const POS_ABBR: Record<string, string> = { Goalkeeper: "GK", Defender: "DEF", Midfielder: "MID", Forward: "FWD" };

// season tuple: [year, teamId, teamName, apps, g, a, cs, mins, rating]
type S = [string, string, string, number, number, number, number, number, number | null];
interface Entry { n: string; p: string; ph: string | null; na: string | null; s: S[] }

export default function PlayerProfile() {
  const sp = useSearchParams();
  const cSlug = sp.get("c") || "premier-league";
  const id = sp.get("id") || "";
  const comp = getCompetition(cSlug);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!comp || !id) { setMissing(true); return; }
    setEntry(null); setMissing(false);
    fetch(`/data/${comp.dataPrefix}players-index.json`, { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((idx) => { const e = idx[id]; e ? setEntry(e) : setMissing(true); })
      .catch(() => setMissing(true));
  }, [comp, id]);

  if (missing || !comp) return <p style={{ color: "var(--muted)" }}>Player not found. <Link href="/players" style={{ color: "var(--accent)" }}>Browse players →</Link></p>;
  if (!entry) return <p style={{ color: "var(--muted)" }}>Loading…</p>;

  const photo = entry.ph || (comp.slug === "premier-league" ? plPhoto(id) : "");
  const tot = entry.s.reduce((a, s) => ({ apps: a.apps + s[3], g: a.g + s[4], as: a.as + s[5], cs: a.cs + s[6] }), { apps: 0, g: 0, as: 0, cs: 0 });
  const best = entry.s.reduce((m, s) => Math.max(m, s[8] ?? 0), 0);
  const isGK = entry.p === "Goalkeeper";

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div className="card" style={{ padding: "1.5rem", display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt={entry.n} width={92} height={116} loading="lazy" style={{ borderRadius: 12, background: "var(--panel-2)", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }} />
        <div style={{ display: "grid", gap: 6 }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: 0 }}>{entry.n}</h1>
          <div style={{ color: "var(--muted)" }}>
            <span className="chip" style={{ marginRight: 8 }}>{POS_ABBR[entry.p] || entry.p}</span>
            {entry.na && <span>{entry.na} · </span>}{comp.name}
          </div>
        </div>
      </div>

      {/* career summary in this league */}
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))" }}>
        {[
          { l: "Seasons", v: entry.s.length },
          { l: "Apps", v: tot.apps },
          { l: isGK ? "Clean sheets" : "Goals", v: isGK ? tot.cs : tot.g },
          { l: isGK ? "Goals" : "Assists", v: isGK ? tot.g : tot.as },
          { l: "Peak rating", v: best || "—" },
        ].map((s) => (
          <div key={s.l} className="card" style={{ padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--accent)" }}>{s.v}</div>
            <div style={{ color: "var(--muted)", fontSize: ".78rem", textTransform: "uppercase" }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* season by season */}
      <section>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: "0 0 8px" }}>{comp.name} — season by season</h2>
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="stat" style={{ minWidth: 460 }}>
            <thead>
              <tr><th>Season</th><th>Club</th><th style={{ textAlign: "center" }}>Apps</th><th style={{ textAlign: "center" }}>G</th><th style={{ textAlign: "center" }}>A</th><th style={{ textAlign: "center" }}>CS</th><th style={{ textAlign: "center" }}>Rating</th></tr>
            </thead>
            <tbody>
              {entry.s.map((s, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{seasonLabel(s[0])}</td>
                  <td><Link href={`/team?c=${comp.slug}&id=${s[1]}`} style={{ color: "var(--accent)", fontWeight: 600 }}>{s[2]}</Link></td>
                  <td style={{ textAlign: "center" }}>{s[3]}</td>
                  <td style={{ textAlign: "center" }}>{s[4]}</td>
                  <td style={{ textAlign: "center" }}>{s[5]}</td>
                  <td style={{ textAlign: "center" }}>{s[6]}</td>
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
