"use client";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  loadHistoryIndex,
  loadSeasonRosters,
  loadStrengths,
  type HistoryIndex,
  type HistPlayer,
  type SeasonTeam,
} from "@/lib/history";
import { simulateSeason, buildFixtures, type SeasonResult } from "@/lib/invincible-sim";
import { recordScore } from "@/lib/progress";
import { playSpin, playSelect, playWin, isMuted, setMuted } from "@/lib/sound";
import Confetti from "@/components/Confetti";
import ScoreSubmit from "@/components/games/ScoreSubmit";

const GAME = "invincibles";
const badge = (id: string) => `https://resources.premierleague.com/premierleague25/badges/${id}.svg`;

export function salaryOf(rating: number): number {
  return Math.round(Math.pow(Math.max(0, rating - 48) / 50, 2.6) * 95 + 1);
}

// ---- positions & eligibility ----
type Pos = "GK" | "DEF" | "MID" | "FWD";
type SlotPos = Pos | "SUB";
const SHORT: Record<string, Pos> = { Goalkeeper: "GK", Defender: "DEF", Midfielder: "MID", Forward: "FWD" };
const ELIG: Record<Pos, Pos[]> = {
  GK: ["GK"],
  DEF: ["DEF", "MID"],
  MID: ["MID", "DEF", "FWD"],
  FWD: ["FWD", "MID"],
};
const OUT_OF_POS = 0.88;
const natOf = (p: HistPlayer): Pos => SHORT[p.pos] ?? "MID";
const eligOf = (p: HistPlayer): Pos[] => ELIG[natOf(p)] ?? ["MID"];
const vBoost = (p: HistPlayer): number => 1 + Math.min(0.15, (eligOf(p).length - 1) * 0.075);
const canFill = (p: HistPlayer, slot: SlotPos): boolean => slot === "SUB" || eligOf(p).includes(slot);
function effRating(p: HistPlayer, slot: SlotPos): number {
  if (slot === "SUB") return Math.min(99, p.rating * vBoost(p)); // utility boost is bench-only
  if (slot === natOf(p)) return p.rating;
  return p.rating * OUT_OF_POS;
}

// position-appropriate stat shown on the roster card
function statLine(p: HistPlayer): string {
  const pos = natOf(p);
  if (pos === "GK") return `${p.cs}CS ${p.sv ?? 0}Sv`;
  if (pos === "DEF") return `${p.cs}CS ${p.tk ?? 0}Tk`;
  return `${p.g}G ${p.a}A`;
}
// position-appropriate stats shown in the modal
function modalStats(p: HistPlayer): [string, string | number][] {
  const pos = natOf(p);
  if (pos === "GK") return [["Rating", p.rating.toFixed(1)], ["Clean sheets", p.cs], ["Saves", p.sv ?? 0], ["Apps", p.apps]];
  if (pos === "DEF") return [["Rating", p.rating.toFixed(1)], ["Clean sheets", p.cs], ["Tackles", p.tk ?? 0], ["Intc", p.intc ?? 0], ["Apps", p.apps]];
  return [["Rating", p.rating.toFixed(1)], ["Goals", p.g], ["Assists", p.a], ["Apps", p.apps], ["CS", p.cs]];
}

type Mode = "five" | "full" | "cap";
const MODE_META: Record<Mode, { label: string; sub: string; respins: number; cap?: number }> = {
  five: { label: "5-a-side", sub: "5 starters + 1 sub", respins: 3 },
  full: { label: "Full squad", sub: "11 + 5 subs · pick a formation", respins: 5 },
  cap: { label: "Salary cap", sub: "16 players · £450m budget", respins: 5, cap: 450 },
};

interface Formation { label: string; def: number; mid: number; fwd: number; }
const FORMATIONS: Formation[] = [
  { label: "4-3-3", def: 4, mid: 3, fwd: 3 },
  { label: "4-4-2", def: 4, mid: 4, fwd: 2 },
  { label: "3-5-2", def: 3, mid: 5, fwd: 2 },
  { label: "4-5-1", def: 4, mid: 5, fwd: 1 },
  { label: "3-4-3", def: 3, mid: 4, fwd: 3 },
  { label: "5-3-2", def: 5, mid: 3, fwd: 2 },
  { label: "5-4-1", def: 5, mid: 4, fwd: 1 },
  { label: "4-2-3-1", def: 4, mid: 5, fwd: 1 },
];
const FIVE: Formation = { label: "5-a-side", def: 1, mid: 2, fwd: 1 };

function slotsFor(mode: Mode, f: Formation): Slot[] {
  if (mode === "five") return (["GK", "DEF", "MID", "MID", "FWD", "SUB"] as SlotPos[]).map((pos) => ({ pos, player: null }));
  const arr: SlotPos[] = ["GK", ...Array(f.def).fill("DEF"), ...Array(f.mid).fill("MID"), ...Array(f.fwd).fill("FWD"), "SUB", "SUB", "SUB", "SUB", "SUB"];
  return arr.map((pos) => ({ pos, player: null }));
}
function pick3(rand: () => number): Formation[] {
  const pool = [...FORMATIONS];
  const out: Formation[] = [];
  for (let i = 0; i < 3 && pool.length; i++) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}

const POS_ROWS: Pos[] = ["GK", "DEF", "MID", "FWD"];
const FILTERS: ("ALL" | Pos)[] = ["ALL", "GK", "DEF", "MID", "FWD"];
const POS_NAME: Record<SlotPos, string> = { GK: "Goalkeeper", DEF: "Defender", MID: "Midfielder", FWD: "Forward", SUB: "Bench" };

interface Pick extends HistPlayer { fromYear: string; fromTeam: string; slot: SlotPos; }
interface Slot { pos: SlotPos; player: Pick | null; }

function tier(r: number) {
  if (r >= 92) return { label: "Generational", color: "#ffd166" };
  if (r >= 87) return { label: "Title-class", color: "#00e676" };
  if (r >= 82) return { label: "Top-four", color: "#38bdf8" };
  if (r >= 76) return { label: "European push", color: "#a78bfa" };
  if (r >= 70) return { label: "Mid-table", color: "#93a0bd" };
  return { label: "Battling drop", color: "#ff5d73" };
}

export default function InvinciblesGame() {
  const [mode, setMode] = useState<Mode>("full");
  const [index, setIndex] = useState<HistoryIndex | null>(null);
  const [strengths, setStrengths] = useState<{ teamId: string; name: string; strength: number }[]>([]);
  const [formation, setFormation] = useState<Formation | null>(null);
  const [formOptions, setFormOptions] = useState<Formation[]>([]);
  const [year, setYear] = useState("");
  const [team, setTeam] = useState<SeasonTeam | null>(null);
  const [roster, setRoster] = useState<HistPlayer[]>([]);
  const [reel, setReel] = useState<{ year: string; name: string; id: string } | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [squad, setSquad] = useState<Slot[]>([]);
  const [filter, setFilter] = useState<"ALL" | Pos>("ALL");
  const [respins, setRespins] = useState(0);
  const [result, setResult] = useState<SeasonResult | null>(null);
  const [viewing, setViewing] = useState<{ p: HistPlayer; source: "roster" | "squad"; slotIndex?: number } | null>(null);
  const [seen, setSeen] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [muted, setM] = useState(false);
  const idxRef = useRef<HistoryIndex | null>(null);

  const meta = MODE_META[mode];

  // ---- spin with slot-machine animation + sound ----
  const spin = useCallback(async () => {
    const idx = idxRef.current;
    if (!idx) return;
    setSpinning(true);
    setViewing(null);
    playSpin(720);
    const flat = idx.seasons.flatMap((s) => s.teams.map((t) => ({ year: s.year, name: t.name, id: t.id })));
    const iv = setInterval(() => setReel(flat[Math.floor(Math.random() * flat.length)]), 60);
    const season = idx.seasons[Math.floor(Math.random() * idx.seasons.length)];
    const tm = season.teams[Math.floor(Math.random() * season.teams.length)];
    const rosters = await loadSeasonRosters(season.year);
    await new Promise((r) => setTimeout(r, 680));
    clearInterval(iv);
    setReel(null);
    setYear(season.year);
    setTeam(tm);
    setRoster(rosters[tm.id] ?? []);
    setSpinning(false);
    playSelect();
  }, []);

  useEffect(() => {
    setM(isMuted());
    Promise.all([loadHistoryIndex(), loadStrengths()]).then(([idx, st]) => {
      idxRef.current = idx;
      setIndex(idx);
      setStrengths(st);
      setLoading(false);
      // default mode "full" → choose a formation first
      setFormOptions(pick3(Math.random));
    });
  }, []);

  const startMode = (m: Mode) => {
    setMode(m);
    setSeen(new Set());
    setResult(null);
    setRespins(MODE_META[m].respins);
    if (m === "five") {
      setFormation(FIVE);
      setSquad(slotsFor("five", FIVE));
      spin();
    } else {
      setFormation(null);
      setFormOptions(pick3(Math.random));
      setSquad([]);
    }
  };

  const chooseFormation = (f: Formation) => {
    setFormation(f);
    setSquad(slotsFor(mode, f));
    setRespins(meta.respins);
    spin();
  };

  const full = squad.length > 0 && squad.every((s) => s.player);

  const openSlotsFor = useCallback(
    (p: HistPlayer): SlotPos[] => {
      const open = new Set<SlotPos>();
      for (const s of squad) if (!s.player && canFill(p, s.pos)) open.add(s.pos);
      return [...open].sort((a, b) => (a === natOf(p) ? -1 : b === natOf(p) ? 1 : a === "SUB" ? 1 : -1));
    },
    [squad]
  );

  const place = (p: HistPlayer, slotPos: SlotPos) => {
    if (seen.has(p.id)) return;
    const i = squad.findIndex((s) => !s.player && s.pos === slotPos);
    if (i === -1) return;
    const next = [...squad];
    next[i] = { pos: slotPos, player: { ...p, fromYear: year, fromTeam: team?.short ?? "", slot: slotPos } };
    setSquad(next);
    setSeen((s) => new Set(s).add(p.id));
    setResult(null);
    setViewing(null);
    playSelect();
    if (!next.every((s) => s.player)) spin(); // free fresh spin for the next pick
  };

  // Tap-to-add: drop the player straight into their natural position with no
  // prompt. Only open the picker when that's full and they'd have to play out
  // of position / on the bench (i.e. there's an actual choice to make).
  const placeSmart = (p: HistPlayer) => {
    if (seen.has(p.id)) return;
    const opts = openSlotsFor(p);
    if (!opts.length) return;
    const nat = natOf(p);
    if (opts.includes(nat)) place(p, nat);
    else if (opts.length === 1) place(p, opts[0]);
    else setViewing({ p, source: "roster" });
  };

  const removeAt = (idx: number) => {
    const p = squad[idx].player;
    if (p) setSeen((s) => { const n = new Set(s); n.delete(p.id); return n; });
    setSquad((sq) => sq.map((s, i) => (i === idx ? { ...s, player: null } : s)));
    setResult(null);
    setViewing(null);
  };

  const reSpin = () => {
    if (respins <= 0 || spinning) return;
    setRespins((r) => r - 1);
    spin();
  };

  const reset = () => startMode(mode);

  const toggleMute = () => { const m = !muted; setM(m); setMuted(m); };

  const rating = useMemo(() => {
    let w = 0, sum = 0;
    for (const s of squad) {
      if (!s.player) continue;
      const weight = s.pos === "SUB" ? 0.35 : 1;
      sum += effRating(s.player, s.pos) * weight;
      w += weight;
    }
    return w ? sum / w : 0;
  }, [squad]);

  const spend = useMemo(() => squad.reduce((a, s) => a + (s.player ? salaryOf(s.player.rating) : 0), 0), [squad]);
  const overBudget = mode === "cap" && spend > (meta.cap ?? Infinity);
  const t = tier(rating);
  const need = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of squad) if (!s.player) m[s.pos] = (m[s.pos] ?? 0) + 1;
    return m;
  }, [squad]);

  const simulate = () => {
    if (!full || !strengths.length || overBudget) return;
    const sorted = strengths.map((s) => s.strength).sort((a, b) => a - b);
    const res = simulateSeason(rating, sorted, buildFixtures(strengths), (Math.random() * 1e9) | 0);
    setResult(res);
    recordScore(GAME, res.story.filter((g) => g.result === "W").length * 3 + res.story.filter((g) => g.result === "D").length);
    if (res.story.every((g) => g.result !== "L")) playWin();
  };

  if (loading) return <p style={{ color: "var(--muted)" }}>Loading seasons of history…</p>;

  // ---- formation chooser (full / cap, before building) ----
  const needFormation = mode !== "five" && !formation;

  const filtered = roster.filter((p) => filter === "ALL" || natOf(p) === filter);
  const starterSlots = squad.map((s, i) => ({ ...s, i })).filter((s) => s.pos !== "SUB");
  const subSlots = squad.map((s, i) => ({ ...s, i })).filter((s) => s.pos === "SUB");

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {/* mode selector + mute */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "stretch" }}>
        {(Object.keys(MODE_META) as Mode[]).map((m) => (
          <button key={m} onClick={() => startMode(m)} className="card" style={{ padding: ".55rem .8rem", cursor: "pointer", flex: "1 1 140px", textAlign: "left", borderColor: mode === m ? "var(--accent)" : "var(--border)", background: mode === m ? "rgba(0,230,118,.1)" : undefined, color: "var(--text)" }}>
            <div style={{ fontWeight: 800 }}>{MODE_META[m].label}</div>
            <div style={{ fontSize: ".74rem", color: "var(--muted)" }}>{MODE_META[m].sub}</div>
          </button>
        ))}
        <button onClick={toggleMute} className="chip" style={{ cursor: "pointer" }} title={muted ? "Unmute" : "Mute"}>{muted ? "🔇" : "🔊"}</button>
      </div>

      {needFormation ? (
        <div className="card" style={{ padding: "1.25rem", display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Pick your formation</h2>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: ".88rem" }}>Three at random — your choice sets the shape of your XI.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {formOptions.map((f) => (
              <button key={f.label} onClick={() => chooseFormation(f)} className="card" style={{ padding: "1rem .5rem", cursor: "pointer", color: "var(--text)", display: "grid", gap: 6, textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 900 }}>{f.label}</div>
                <div style={{ fontSize: ".72rem", color: "var(--muted)" }}>{f.def} DEF · {f.mid} MID · {f.fwd} FWD</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* SPIN + PICK PANEL — kept at the top so you never scroll to select */}
          {!full && (
            <div className="card" style={{ padding: "1rem", display: "grid", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, minHeight: 26 }}>
                  {spinning && reel ? (
                    <span className="pop" style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.9 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={badge(reel.id)} alt="" width={22} height={22} />
                      <span style={{ color: "var(--accent2)" }}>{reel.year}/{(Number(reel.year) + 1) % 100}</span> {reel.name}
                    </span>
                  ) : (
                    team && (
                      <>
                        <span className="chip" style={{ fontWeight: 800 }}>📅 {year}/{(Number(year) + 1) % 100}</span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={badge(team.id)} alt="" width={22} height={22} />
                        {team.name}
                      </>
                    )
                  )}
                </div>
                <button className="btn" onClick={reSpin} disabled={respins <= 0 || spinning} style={{ marginLeft: "auto" }}>
                  🎰 Re-spin ({respins})
                </button>
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {FILTERS.map((f) => (
                  <button key={f} onClick={() => setFilter(f)} className="chip" style={{ cursor: "pointer", color: filter === f ? "#04220f" : "var(--text)", background: filter === f ? "var(--accent)" : "var(--panel-2)" }}>{f}</button>
                ))}
                <span style={{ marginLeft: "auto", fontSize: ".74rem", color: "var(--muted)" }}>
                  Need: {Object.entries(need).map(([p, n]) => `${n} ${p}`).join(" · ") || "—"}
                </span>
              </div>

              <p style={{ margin: "0 0 -2px", fontSize: ".72rem", color: "var(--muted)" }}>Tap a player to add them to their position · ⓘ for stats &amp; other slots</p>
              <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(auto-fill,minmax(155px,1fr))", maxHeight: 270, overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", opacity: spinning ? 0.4 : 1, transition: "opacity .2s" }}>
                {filtered.map((p) => {
                  const usable = !seen.has(p.id) && openSlotsFor(p).length > 0;
                  const versatile = eligOf(p).length > 1;
                  return (
                    <div key={p.id} className="card" style={{ padding: ".45rem .5rem", display: "flex", gap: 6, alignItems: "center", opacity: usable ? 1 : 0.4 }}>
                      <button onClick={() => placeSmart(p)} disabled={!usable || spinning} style={{ flex: 1, minWidth: 0, display: "flex", gap: 8, alignItems: "center", background: "transparent", border: "none", padding: 0, color: "var(--text)", cursor: usable ? "pointer" : "not-allowed", textAlign: "left" }}>
                        <span style={{ fontWeight: 900, color: "var(--accent)", minWidth: 26 }}>{p.rating.toFixed(0)}</span>
                        <span style={{ minWidth: 0 }}>
                          <span style={{ fontWeight: 700, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: ".82rem" }}>{p.name} {versatile && <span title="Versatile" style={{ color: "var(--gold)" }}>★</span>}</span>
                          <span style={{ color: "var(--muted)", fontSize: ".7rem" }}>{natOf(p)} · {statLine(p)}{mode === "cap" ? ` · £${salaryOf(p.rating)}m` : ""}</span>
                        </span>
                      </button>
                      <button onClick={() => setViewing({ p, source: "roster" })} disabled={spinning} title="Stats & position options" aria-label="View stats" style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "1.05rem", padding: "0 .15rem", lineHeight: 1 }}>ⓘ</button>
                    </div>
                  );
                })}
                {!spinning && filtered.length === 0 && <p style={{ color: "var(--muted)", gridColumn: "1/-1" }}>No {filter} players here — try a filter or re-spin.</p>}
              </div>
            </div>
          )}

          {/* squad pitch (progress) */}
          <div style={{ background: "radial-gradient(120% 100% at 50% 0%, #0e7a46 0%, #0a5e36 60%, #084c2c 100%)", border: "1px solid var(--border)", borderRadius: 18, padding: "1rem .6rem", position: "relative" }}>
            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "rgba(255,255,255,.13)" }} />
            <div style={{ position: "absolute", top: "50%", left: "50%", width: 76, height: 76, transform: "translate(-50%,-50%)", border: "1px solid rgba(255,255,255,.13)", borderRadius: "50%" }} />
            <div style={{ position: "relative", display: "grid", gap: 9 }}>
              {POS_ROWS.map((P) => {
                const row = starterSlots.filter((s) => s.pos === P);
                if (!row.length) return null;
                return (
                  <div key={P} style={{ display: "flex", justifyContent: "center", gap: 7, flexWrap: "wrap" }}>
                    {row.map((s) => s.player ? <PlayerChip key={s.i} p={s.player} onClick={() => setViewing({ p: s.player!, source: "squad", slotIndex: s.i })} /> : <EmptySlot key={s.i} pos={P} />)}
                  </div>
                );
              })}
            </div>
          </div>

          {subSlots.length > 0 && (
            <div>
              <div style={{ fontSize: ".7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 5 }}>Bench</div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {subSlots.map((s) => s.player ? <PlayerChip key={s.i} p={s.player} small onClick={() => setViewing({ p: s.player!, source: "squad", slotIndex: s.i })} /> : <EmptySlot key={s.i} pos="SUB" small />)}
              </div>
            </div>
          )}

          {/* status */}
          <div className="card" style={{ padding: ".7rem 1rem", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div><div style={{ fontSize: ".66rem", color: "var(--muted)", textTransform: "uppercase" }}>Squad</div><div style={{ fontWeight: 800 }}>{squad.filter((s) => s.player).length}/{squad.length}</div></div>
            <div><div style={{ fontSize: ".66rem", color: "var(--muted)", textTransform: "uppercase" }}>Rating</div><div style={{ fontWeight: 900, fontSize: "1.2rem", color: t.color }}>{rating ? rating.toFixed(1) : "—"}</div></div>
            {mode === "cap" && <div><div style={{ fontSize: ".66rem", color: "var(--muted)", textTransform: "uppercase" }}>Spend</div><div style={{ fontWeight: 800, color: overBudget ? "var(--danger)" : "var(--text)" }}>£{spend}/{meta.cap}m</div></div>}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button className="btn" onClick={reset}>↺ Reset</button>
              {full && <button className="btn btn-primary" onClick={simulate} disabled={overBudget}>▶ Simulate</button>}
            </div>
          </div>

          {overBudget && <div style={{ color: "var(--danger)", fontWeight: 700, textAlign: "center" }}>£{spend - (meta.cap ?? 0)}m over budget — remove a player or pick cheaper ones.</div>}
          {rating > 0 && !result && <div style={{ textAlign: "center", color: t.color, fontWeight: 700 }}>{t.label} side · {formation?.label}</div>}
          {result && <ResultPanel result={result} rating={rating} mode={mode} />}
        </>
      )}

      {viewing && (
        <PlayerModal
          v={viewing}
          openSlots={viewing.source === "roster" ? openSlotsFor(viewing.p) : []}
          year={viewing.source === "roster" ? year : (viewing.p as Pick).fromYear}
          team={viewing.source === "roster" ? team?.name ?? "" : (viewing.p as Pick).fromTeam}
          onAdd={place}
          onRemove={() => viewing.slotIndex != null && removeAt(viewing.slotIndex)}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

function EmptySlot({ pos, small }: { pos: SlotPos; small?: boolean }) {
  return <div style={{ width: small ? 88 : 100, minHeight: small ? 54 : 86, borderRadius: 10, border: "1px dashed rgba(255,255,255,.3)", display: "grid", placeItems: "center", color: "rgba(255,255,255,.65)", fontWeight: 800, fontSize: ".78rem", background: "rgba(0,0,0,.18)" }}>{pos}</div>;
}

function PlayerChip({ p, small, onClick }: { p: Pick; small?: boolean; onClick: () => void }) {
  const secondary = p.slot !== "SUB" && p.slot !== natOf(p);
  return (
    <button onClick={onClick} className="card" style={{ padding: small ? ".3rem .45rem" : ".4rem .55rem", textAlign: "center", minWidth: small ? 88 : 100, background: "rgba(10,14,26,.8)", color: "var(--text)", cursor: "pointer" }} title={`${p.name} — ${p.fromTeam} ${p.fromYear}`}>
      <div style={{ fontWeight: 900, color: "var(--accent)", fontSize: small ? ".88rem" : "1rem" }}>{effRating(p, p.slot).toFixed(0)}{p.slot !== "SUB" && <span style={{ fontSize: ".58rem", color: secondary ? "var(--gold)" : "var(--muted)", marginLeft: 3 }}>{p.slot}{secondary ? "*" : ""}</span>}</div>
      <div style={{ fontWeight: 700, fontSize: small ? ".68rem" : ".74rem", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: small ? 80 : 92 }}>{p.name}</div>
      <div style={{ color: "var(--muted)", fontSize: ".62rem" }}>{p.fromTeam} {String(p.fromYear).slice(2)}</div>
    </button>
  );
}

function PlayerModal({ v, openSlots, year, team, onAdd, onRemove, onClose }: {
  v: { p: HistPlayer; source: "roster" | "squad"; slotIndex?: number };
  openSlots: SlotPos[]; year: string; team: string;
  onAdd: (p: HistPlayer, slot: SlotPos) => void; onRemove: () => void; onClose: () => void;
}) {
  const p = v.p;
  const age = p.born ? Number(year) - p.born : null;
  const boost = vBoost(p);
  const photo = `https://resources.premierleague.com/premierleague25/photos/players/110x140/${p.id}.png`;
  const stats = modalStats(p);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "grid", placeItems: "center", zIndex: 100, padding: "1rem" }}>
      <div onClick={(e) => e.stopPropagation()} className="card pop" style={{ width: "min(420px,100%)", padding: "1.25rem", maxHeight: "85dvh", overflowY: "auto" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" width={64} height={80} loading="lazy" style={{ borderRadius: 10, background: "var(--panel-2)", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }} />
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: "1.2rem" }}>{p.name}</h3>
            <div style={{ color: "var(--muted)", fontSize: ".85rem" }}>{team} · {year}/{(Number(year) + 1) % 100}</div>
            <div style={{ color: "var(--muted)", fontSize: ".85rem" }}>{POS_NAME[natOf(p)]}{p.nat ? ` · ${p.nat}` : ""}{age ? ` · ${age}y` : ""}{p.shirt ? ` · #${p.shirt}` : ""}</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${stats.length},1fr)`, gap: 6, margin: "1rem 0" }}>
          {stats.map(([l, val]) => (
            <div key={l} style={{ background: "var(--panel-2)", borderRadius: 8, padding: ".5rem .3rem", textAlign: "center" }}>
              <div style={{ fontWeight: 900, color: "var(--accent)" }}>{val}</div>
              <div style={{ fontSize: ".6rem", color: "var(--muted)", textTransform: "uppercase" }}>{l}</div>
            </div>
          ))}
        </div>
        {boost > 1 && <div className="chip" style={{ color: "var(--gold)", marginBottom: 12 }}>★ Versatile — can play {eligOf(p).join(", ")} · ×{boost.toFixed(2)} bench boost</div>}
        {v.source === "roster" ? (
          openSlots.length > 0 ? (
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: ".75rem", color: "var(--muted)", textTransform: "uppercase" }}>Add to position</div>
              {openSlots.map((slot) => {
                const secondary = slot !== "SUB" && slot !== natOf(p);
                return <button key={slot} className="btn btn-primary" onClick={() => onAdd(p, slot)} style={{ justifyContent: "space-between" }}><span>{POS_NAME[slot]}{secondary ? " (out of position)" : ""}</span><strong>{effRating(p, slot).toFixed(0)}</strong></button>;
              })}
            </div>
          ) : <p style={{ color: "var(--muted)", margin: 0 }}>No open slot fits this player right now.</p>
        ) : <button className="btn" onClick={onRemove} style={{ width: "100%", color: "var(--danger)" }}>Remove from squad</button>}
        <button className="btn" onClick={onClose} style={{ width: "100%", marginTop: 8 }}>Close</button>
      </div>
    </div>
  );
}

function ResultPanel({ result, rating, mode }: { result: SeasonResult; rating: number; mode: Mode }) {
  const story = result.story;
  const W = story.filter((g) => g.result === "W").length;
  const D = story.filter((g) => g.result === "D").length;
  const L = story.filter((g) => g.result === "L").length;
  const unbeaten = L === 0;
  const perfect = L === 0 && D === 0;
  const inv = result.invinciblePct;
  const invLabel = inv >= 1 ? `${inv.toFixed(1)}%` : inv >= 0.05 ? `${inv.toFixed(2)}%` : "<0.05%";
  const share = () => {
    const txt = `My ${MODE_META[mode].label} Invincibles XI (${rating.toFixed(1)}): ${W}W ${D}D ${L}L${perfect ? " — PERFECT SEASON! 🌟" : unbeaten ? " — INVINCIBLE! 🏆" : ""}\nfootballinvincibles.com/games/invincibles`;
    navigator.clipboard?.writeText(txt).catch(() => {});
  };
  return (
    <div className="card pop" style={{ padding: "1.25rem", display: "grid", gap: 14 }}>
      {unbeaten && <Confetti />}
      <div style={{ textAlign: "center" }}>
        {perfect ? <h2 style={{ fontSize: "2rem", margin: 0, color: "var(--gold)", fontWeight: 900 }}>🌟 PERFECT SEASON! 🌟</h2>
          : unbeaten ? <h2 style={{ fontSize: "2rem", margin: 0, color: "var(--gold)", fontWeight: 900 }}>🏆 INVINCIBLE! 🏆</h2>
          : <h2 style={{ fontSize: "1.5rem", margin: 0, fontWeight: 900 }}>{L} defeat{L === 1 ? "" : "s"} — not quite</h2>}
        <p style={{ color: "var(--muted)", margin: ".25rem 0 0" }}>A representative season for your {rating.toFixed(1)}-rated squad.</p>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <Stat label="Won" value={W} /><Stat label="Drawn" value={D} /><Stat label="Lost" value={L} color="var(--danger)" /><Stat label="Points" value={W * 3 + D} /><Stat label="Unbeaten odds" value={invLabel} />
      </div>
      <div>
        <div style={{ fontSize: ".72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>The 38-game story</div>
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {story.map((g, i) => <span key={i} title={`MW${g.round}: ${g.home ? "vs" : "@"} ${g.oppName} — ${g.result}`} style={{ width: 22, height: 22, display: "grid", placeItems: "center", borderRadius: 5, fontSize: ".62rem", fontWeight: 800, color: g.result === "L" ? "#fff" : "#04220f", background: g.result === "W" ? "var(--accent)" : g.result === "D" ? "var(--gold)" : "var(--danger)" }}>{g.result}</span>)}
        </div>
      </div>
      <ScoreSubmit entries={unbeaten ? [{ game: "invincibles", score: W * 3 + D }, { game: "undefeated", score: W * 3 + D }] : [{ game: "invincibles", score: W * 3 + D }]} label={unbeaten ? "Post to the Wall" : "Submit score"} />
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <button className="btn btn-primary" onClick={share}>📋 Share</button>
        <a className="btn" href="/leaderboard">🏆 Hall of Fame</a>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return <div className="card" style={{ padding: ".6rem 1rem", textAlign: "center", minWidth: 80 }}><div style={{ fontSize: "1.4rem", fontWeight: 900, color: color ?? "var(--text)" }}>{value}</div><div style={{ fontSize: ".66rem", color: "var(--muted)", textTransform: "uppercase" }}>{label}</div></div>;
}
