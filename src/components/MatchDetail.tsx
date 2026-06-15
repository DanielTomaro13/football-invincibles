"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getCompetition } from "@/lib/competitions";
import { teamBadge } from "@/lib/api-client";

interface Player { id: string; name: string; num: number | null; pos: string | null; cap: boolean }
interface Side { id: string; name: string; score: number; formation: string | null; xi: Player[]; bench: Player[] }
interface Ev { min: number; type: string; team: "home" | "away"; player: string; assist?: string }
interface Stat { label: string; home: number; away: number; pct?: boolean }
interface Match { id: string; mw: number; date: string; ground: string; home: Side; away: Side; events: Ev[]; stats: Stat[] }

const EV_ICON: Record<string, string> = { goal: "⚽", pen: "⚽", og: "⚽", yellow: "🟨", red: "🟥" };

export default function MatchDetail() {
  const sp = useSearchParams();
  const cSlug = sp.get("c") || "premier-league";
  const id = sp.get("id") || "";
  const comp = getCompetition(cSlug);
  const [m, setM] = useState<Match | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!comp || !id) { setMissing(true); return; }
    setM(null); setMissing(false);
    // Serie A match ids contain "::"; the file is named after the trailing hex.
    const safeId = id.includes("::") ? id.split("::").pop() : id;
    fetch(`/data/${comp.dataPrefix}matches/${safeId}.json`, { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setM)
      .catch(() => setMissing(true));
  }, [comp, id]);

  if (missing || !comp) return (
    <div style={{ display: "grid", gap: 12 }}>
      <p style={{ color: "var(--muted)" }}>Detailed lineups and stats aren&apos;t available for this match yet.</p>
      <Link href="/matches" style={{ color: "var(--accent)" }}>← Back to fixtures</Link>
    </div>
  );
  if (!m) return <p style={{ color: "var(--muted)" }}>Loading…</p>;

  const badge = (tid: string) => comp.slug === "premier-league" ? teamBadge(tid) : "";

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <Link href="/matches" style={{ color: "var(--accent)", fontSize: ".88rem" }}>← Fixtures</Link>

      {/* scoreline */}
      <div className="card" style={{ padding: "1.25rem", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12 }}>
        <TeamHead side={m.home} badge={badge(m.home.id)} comp={comp.slug} align="flex-end" />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{m.home.score} – {m.away.score}</div>
          <div style={{ color: "var(--muted)", fontSize: ".75rem" }}>MW {m.mw}{m.ground ? ` · ${m.ground}` : ""}</div>
        </div>
        <TeamHead side={m.away} badge={badge(m.away.id)} comp={comp.slug} align="flex-start" />
      </div>

      {/* events */}
      {m.events.length > 0 && (
        <section>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 8px" }}>Timeline</h2>
          <div className="card" style={{ padding: ".5rem 0" }}>
            {m.events.map((e, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: ".35rem 1rem", flexDirection: e.team === "away" ? "row-reverse" : "row", textAlign: e.team === "away" ? "right" : "left" }}>
                <span style={{ width: 34, color: "var(--muted)", fontWeight: 700, flexShrink: 0 }}>{e.min}&apos;</span>
                <span style={{ flexShrink: 0 }}>{EV_ICON[e.type] || "•"}</span>
                <span style={{ flex: 1, fontWeight: 600 }}>
                  {e.player}{e.type === "pen" ? " (pen)" : e.type === "og" ? " (OG)" : ""}
                  {e.assist ? <span style={{ color: "var(--muted)", fontWeight: 400 }}> · {e.assist}</span> : null}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* team stats */}
      {m.stats.length > 0 && (
        <section>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 8px" }}>Match stats</h2>
          <div className="card" style={{ padding: "1rem", display: "grid", gap: 12 }}>
            {m.stats.map((s) => {
              const tot = s.home + s.away || 1;
              const hp = s.pct ? s.home : Math.round((s.home / tot) * 100);
              return (
                <div key={s.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".82rem", marginBottom: 3 }}>
                    <strong>{s.home}{s.pct ? "%" : ""}</strong>
                    <span style={{ color: "var(--muted)" }}>{s.label}</span>
                    <strong>{s.away}{s.pct ? "%" : ""}</strong>
                  </div>
                  <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: "var(--panel-2)" }}>
                    <div style={{ width: `${hp}%`, background: "var(--accent)" }} />
                    <div style={{ width: `${100 - hp}%`, background: "var(--accent-2)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* lineups */}
      <section>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 8px" }}>Lineups</h2>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
          {[m.home, m.away].map((side) => (
            <div key={side.id} className="card" style={{ padding: "1rem" }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>{side.name} {side.formation && <span style={{ color: "var(--muted)", fontWeight: 600, fontSize: ".85rem" }}>· {side.formation}</span>}</div>
              <PlayerList comp={comp.slug} players={side.xi} />
              {side.bench.length > 0 && <>
                <div style={{ color: "var(--muted)", fontSize: ".75rem", textTransform: "uppercase", margin: "10px 0 4px" }}>Bench</div>
                <PlayerList comp={comp.slug} players={side.bench} muted />
              </>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TeamHead({ side, badge, comp, align }: { side: Side; badge: string; comp: string; align: string }) {
  return (
    <Link href={`/team?c=${comp}&id=${side.id}`} style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: align, fontWeight: 800 }}>
      {align === "flex-start" && badge && /* eslint-disable-next-line @next/next/no-img-element */ <img src={badge} alt="" width={28} height={28} onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }} />}
      <span>{side.name}</span>
      {align === "flex-end" && badge && /* eslint-disable-next-line @next/next/no-img-element */ <img src={badge} alt="" width={28} height={28} onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }} />}
    </Link>
  );
}

function PlayerList({ comp, players, muted }: { comp: string; players: Player[]; muted?: boolean }) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 1 }}>
      {players.map((p) => (
        <li key={p.id}>
          <Link href={`/player?c=${comp}&id=${p.id}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 2px", color: muted ? "var(--muted)" : "var(--text)" }}>
            <span style={{ width: 22, textAlign: "right", color: "var(--muted)", flexShrink: 0 }}>{p.num ?? ""}</span>
            <span style={{ fontWeight: 600 }}>{p.name}</span>
            {p.cap && <span title="Captain" style={{ fontSize: ".65rem", color: "var(--gold)" }}>(C)</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
