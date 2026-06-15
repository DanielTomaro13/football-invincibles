"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getCompetition, seasonLabel } from "@/lib/competitions";
import { loadSeasonRosters, type HistPlayer } from "@/lib/history";

const POS_ORDER: Record<string, number> = { Goalkeeper: 0, Defender: 1, Midfielder: 2, Forward: 3 };
const POS_ABBR: Record<string, string> = { Goalkeeper: "GK", Defender: "DEF", Midfielder: "MID", Forward: "FWD" };

// season tuple: [year, position, played, won, drawn, lost, gf, ga, pts]
type S = [string, number, number, number, number, number, number, number, number];
interface Entry { n: string; sh: string; b: string | null; s: S[] }

export default function TeamProfile() {
  const sp = useSearchParams();
  const cSlug = sp.get("c") || "premier-league";
  const id = sp.get("id") || "";
  const comp = getCompetition(cSlug);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [missing, setMissing] = useState(false);
  const [year, setYear] = useState<string>("");
  const [squad, setSquad] = useState<HistPlayer[] | null>(null);

  useEffect(() => {
    if (!comp || !id) { setMissing(true); return; }
    setEntry(null); setMissing(false);
    fetch(`/data/${comp.dataPrefix}teams-index.json`, { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((idx) => { const e = idx[id]; if (e) { setEntry(e); setYear(e.s[0]?.[0] || ""); } else setMissing(true); })
      .catch(() => setMissing(true));
  }, [comp, id]);

  useEffect(() => {
    if (!comp || !year) return;
    setSquad(null);
    loadSeasonRosters(year, comp.dataPrefix)
      .then((r) => setSquad((r[id] || []).slice().sort((a, b) => (POS_ORDER[a.pos] ?? 9) - (POS_ORDER[b.pos] ?? 9) || (b.rating ?? 0) - (a.rating ?? 0))))
      .catch(() => setSquad([]));
  }, [comp, id, year]);

  const summary = useMemo(() => {
    if (!entry) return null;
    const titles = entry.s.filter((s) => s[1] === 1).length;
    const best = Math.min(...entry.s.map((s) => s[1]));
    return { titles, best, seasons: entry.s.length };
  }, [entry]);

  if (missing || !comp) return <p style={{ color: "var(--muted)" }}>Club not found. <Link href="/tables" style={{ color: "var(--accent)" }}>Browse tables →</Link></p>;
  if (!entry) return <p style={{ color: "var(--muted)" }}>Loading…</p>;

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div className="card" style={{ padding: "1.5rem", display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
        {entry.b && /* eslint-disable-next-line @next/next/no-img-element */ <img src={entry.b} alt="" width={64} height={64} style={{ objectFit: "contain" }} onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }} />}
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: 0 }}>{entry.n}</h1>
          <div style={{ color: "var(--muted)" }}>{comp.name} · {summary!.seasons} seasons{summary!.titles ? ` · 🏆 ${summary!.titles} title${summary!.titles > 1 ? "s" : ""}` : ""} · best finish #{summary!.best}</div>
        </div>
      </div>

      <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", alignItems: "start" }}>
        {/* league finishes */}
        <section>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: "0 0 8px" }}>League finishes</h2>
          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <table className="stat" style={{ minWidth: 380 }}>
              <thead><tr><th>Season</th><th style={{ textAlign: "center" }}>Pos</th><th style={{ textAlign: "center" }}>P</th><th style={{ textAlign: "center" }}>W</th><th style={{ textAlign: "center" }}>D</th><th style={{ textAlign: "center" }}>L</th><th style={{ textAlign: "center" }}>GD</th><th style={{ textAlign: "center" }}>Pts</th></tr></thead>
              <tbody>
                {entry.s.map((s) => (
                  <tr key={s[0]} style={{ cursor: "pointer", background: s[0] === year ? "rgba(255,255,255,.03)" : undefined }} onClick={() => setYear(s[0])}>
                    <td style={{ fontWeight: 600 }}>{seasonLabel(s[0])}</td>
                    <td style={{ textAlign: "center", fontWeight: 800, color: s[1] === 1 ? "var(--gold)" : "var(--text)" }}>{s[1] === 1 ? "🏆" : s[1]}</td>
                    <td style={{ textAlign: "center" }}>{s[2]}</td>
                    <td style={{ textAlign: "center" }}>{s[3]}</td>
                    <td style={{ textAlign: "center" }}>{s[4]}</td>
                    <td style={{ textAlign: "center" }}>{s[5]}</td>
                    <td style={{ textAlign: "center" }}>{s[6] - s[7]}</td>
                    <td style={{ textAlign: "center", fontWeight: 800 }}>{s[8]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* squad for the selected season */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>Squad</h2>
            <select value={year} onChange={(e) => setYear(e.target.value)} style={{ minHeight: 34, padding: "0 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)", fontWeight: 700, fontFamily: "inherit" }}>
              {entry.s.map((s) => <option key={s[0]} value={s[0]}>{seasonLabel(s[0])}</option>)}
            </select>
          </div>
          <div className="card" style={{ padding: ".25rem 0" }}>
            {squad === null ? <div style={{ padding: "1rem", color: "var(--muted)" }}>Loading…</div>
              : squad.length === 0 ? <div style={{ padding: "1rem", color: "var(--muted)" }}>No squad recorded.</div>
              : (
                <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {squad.map((p) => (
                    <li key={String(p.id)}>
                      <Link href={`/player?c=${comp.slug}&id=${p.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: ".45rem 1rem", borderBottom: "1px solid var(--border)" }}>
                        <span className="chip" style={{ minWidth: 42, justifyContent: "center" }}>{POS_ABBR[p.pos] || p.pos}</span>
                        <span style={{ flex: 1, fontWeight: 600 }}>{p.name}</span>
                        <span style={{ color: "var(--muted)", fontSize: ".8rem" }}>{p.g}G {p.a}A</span>
                        <strong style={{ color: "var(--accent)", minWidth: 32, textAlign: "right" }}>{p.rating}</strong>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
          </div>
        </section>
      </div>
    </div>
  );
}
