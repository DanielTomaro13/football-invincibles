"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
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
import Confetti from "@/components/Confetti";
import ScoreSubmit from "@/components/games/ScoreSubmit";

const GAME = "invincibles";

export function salaryOf(rating: number): number {
  return Math.round(Math.pow(Math.max(0, rating - 58) / 42, 2.6) * 78 + 1);
}

// ---- positions & eligibility ----
type Pos = "GK" | "DEF" | "MID" | "FWD";
type SlotPos = Pos | "SUB";
const SHORT: Record<string, Pos> = { Goalkeeper: "GK", Defender: "DEF", Midfielder: "MID", Forward: "FWD" };
// which positions a player can fill — natural first, then adjacent
const ELIG: Record<Pos, Pos[]> = {
  GK: ["GK"],
  DEF: ["DEF", "MID"],
  MID: ["MID", "DEF", "FWD"],
  FWD: ["FWD", "MID"],
};
const OUT_OF_POS = 0.88; // penalty for playing a secondary position

const natOf = (p: HistPlayer): Pos => SHORT[p.pos] ?? "MID";
const eligOf = (p: HistPlayer): Pos[] => ELIG[natOf(p)] ?? ["MID"];
// versatility: more positions => small boost, capped at 1.15x
const vBoost = (p: HistPlayer): number => 1 + Math.min(0.15, (eligOf(p).length - 1) * 0.075);
const canFill = (p: HistPlayer, slot: SlotPos): boolean => slot === "SUB" || eligOf(p).includes(slot);
function effRating(p: HistPlayer, slot: SlotPos): number {
  // the versatility (utility) boost only applies on the bench, where covering
  // several positions is what makes a squad player valuable
  if (slot === "SUB") return Math.min(99, p.rating * vBoost(p));
  if (slot === natOf(p)) return p.rating; // natural starting position
  return p.rating * OUT_OF_POS; // out of position, penalised
}

type Mode = "five" | "full" | "cap";
const MODES: Record<Mode, { label: string; sub: string; slots: SlotPos[]; cap?: number }> = {
  five: { label: "5-a-side", sub: "5 starters + 1 sub", slots: ["GK", "DEF", "MID", "MID", "FWD", "SUB"] },
  full: {
    label: "Full squad",
    sub: "11 starters + 5 subs",
    slots: ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "FWD", "FWD", "FWD", "SUB", "SUB", "SUB", "SUB", "SUB"],
  },
  cap: {
    label: "Salary cap",
    sub: "16 players · £400m",
    slots: ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "FWD", "FWD", "FWD", "SUB", "SUB", "SUB", "SUB", "SUB"],
    cap: 400,
  },
};
const CLUB_RESPINS = 3;
const YEAR_RESPINS = 3;
const POS_ROWS: Pos[] = ["GK", "DEF", "MID", "FWD"];
const FILTERS: ("ALL" | Pos)[] = ["ALL", "GK", "DEF", "MID", "FWD"];

interface Pick extends HistPlayer {
  fromYear: string;
  fromTeam: string;
  slot: SlotPos;
}
interface Slot {
  pos: SlotPos;
  player: Pick | null;
}

function tier(r: number) {
  if (r >= 94) return { label: "Generational", color: "#ffd166" };
  if (r >= 90) return { label: "Title-class", color: "#00e676" };
  if (r >= 86) return { label: "Top-four", color: "#38bdf8" };
  if (r >= 81) return { label: "European push", color: "#a78bfa" };
  if (r >= 76) return { label: "Mid-table", color: "#93a0bd" };
  return { label: "Battling drop", color: "#ff5d73" };
}

const newSquad = (m: Mode): Slot[] => MODES[m].slots.map((pos) => ({ pos, player: null }));

export default function InvinciblesGame() {
  const [mode, setMode] = useState<Mode>("full");
  const [index, setIndex] = useState<HistoryIndex | null>(null);
  const [strengths, setStrengths] = useState<{ teamId: string; name: string; strength: number }[]>([]);
  const [year, setYear] = useState<string>("");
  const [team, setTeam] = useState<SeasonTeam | null>(null);
  const [roster, setRoster] = useState<HistPlayer[]>([]);
  const [squad, setSquad] = useState<Slot[]>(() => newSquad("full"));
  const [filter, setFilter] = useState<"ALL" | Pos>("ALL");
  const [clubRe, setClubRe] = useState(CLUB_RESPINS);
  const [yearRe, setYearRe] = useState(YEAR_RESPINS);
  const [result, setResult] = useState<SeasonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [viewing, setViewing] = useState<{ p: HistPlayer; source: "roster" | "squad"; slotIndex?: number } | null>(null);
  const [seen, setSeen] = useState<Set<number>>(new Set());

  const cfg = MODES[mode];

  const spin = useCallback(async (idx: HistoryIndex, keepYear: string | null) => {
    setSpinning(true);
    const yr = keepYear ?? idx.seasons[Math.floor(Math.random() * idx.seasons.length)].year;
    const season = idx.seasons.find((s) => s.year === yr)!;
    const tm = season.teams[Math.floor(Math.random() * season.teams.length)];
    const rosters = await loadSeasonRosters(yr);
    setYear(yr);
    setTeam(tm);
    setRoster(rosters[tm.id] ?? []);
    setSpinning(false);
  }, []);

  useEffect(() => {
    Promise.all([loadHistoryIndex(), loadStrengths()]).then(([idx, st]) => {
      setIndex(idx);
      setStrengths(st);
      setLoading(false);
      spin(idx, null);
    });
  }, [spin]);

  const full = squad.every((s) => s.player);

  // distinct open slot positions a player could fill right now
  const openSlotsFor = useCallback(
    (p: HistPlayer): SlotPos[] => {
      const open = new Set<SlotPos>();
      for (const s of squad) if (!s.player && canFill(p, s.pos)) open.add(s.pos);
      return [...open].sort((a, b) => (a === natOf(p) ? -1 : b === natOf(p) ? 1 : a === "SUB" ? 1 : -1));
    },
    [squad]
  );

  const place = (p: HistPlayer, slotPos: SlotPos) => {
    if (!index || seen.has(p.id)) return;
    const i = squad.findIndex((s) => !s.player && s.pos === slotPos);
    if (i === -1) return;
    const next = [...squad];
    next[i] = { pos: slotPos, player: { ...p, fromYear: year, fromTeam: team?.short ?? "", slot: slotPos } };
    setSquad(next);
    setSeen((s) => new Set(s).add(p.id));
    setResult(null);
    setViewing(null);
    if (!next.every((s) => s.player)) spin(index, null);
  };

  const removeAt = (idx: number) => {
    const p = squad[idx].player;
    if (p) setSeen((s) => { const n = new Set(s); n.delete(p.id); return n; });
    setSquad((sq) => sq.map((s, i) => (i === idx ? { ...s, player: null } : s)));
    setResult(null);
    setViewing(null);
  };

  const respinClub = () => { if (clubRe > 0 && index) { setClubRe((n) => n - 1); spin(index, year); } };
  const respinYear = () => { if (yearRe > 0 && index) { setYearRe((n) => n - 1); spin(index, null); } };
  const reset = () => {
    setSeen(new Set());
    setSquad(newSquad(mode));
    setClubRe(CLUB_RESPINS);
    setYearRe(YEAR_RESPINS);
    setResult(null);
    if (index) spin(index, null);
  };
  const changeMode = (m: Mode) => {
    setMode(m);
    setSeen(new Set());
    setSquad(newSquad(m));
    setClubRe(CLUB_RESPINS);
    setYearRe(YEAR_RESPINS);
    setResult(null);
  };

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
  const overBudget = mode === "cap" && spend > (cfg.cap ?? Infinity);
  const t = tier(rating);

  // "still need" summary
  const need = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of squad) if (!s.player) m[s.pos] = (m[s.pos] ?? 0) + 1;
    return m;
  }, [squad]);

  const simulate = () => {
    if (!full || !strengths.length || overBudget) return;
    const sorted = strengths.map((s) => s.strength).sort((a, b) => a - b);
    const fixtures = buildFixtures(strengths);
    const res = simulateSeason(rating, sorted, fixtures, (Math.random() * 1e9) | 0);
    setResult(res);
    const pts = res.story.filter((g) => g.result === "W").length * 3 + res.story.filter((g) => g.result === "D").length;
    recordScore(GAME, pts); // personal best (local)
  };

  if (loading) return <p style={{ color: "var(--muted)" }}>Loading 16 seasons of history…</p>;

  const filtered = roster.filter((p) => filter === "ALL" || natOf(p) === filter);
  const starterSlots = squad.map((s, i) => ({ ...s, i })).filter((s) => s.pos !== "SUB");
  const subSlots = squad.map((s, i) => ({ ...s, i })).filter((s) => s.pos === "SUB");

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      {/* mode selector */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(Object.keys(MODES) as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => changeMode(m)}
            className="card"
            style={{
              padding: ".6rem .9rem",
              cursor: "pointer",
              flex: "1 1 150px",
              textAlign: "left",
              borderColor: mode === m ? "var(--accent)" : "var(--border)",
              background: mode === m ? "rgba(0,230,118,.1)" : undefined,
              color: "var(--text)",
            }}
          >
            <div style={{ fontWeight: 800 }}>{MODES[m].label}</div>
            <div style={{ fontSize: ".78rem", color: "var(--muted)" }}>{MODES[m].sub}</div>
          </button>
        ))}
      </div>

      {/* pitch with position slots */}
      <div
        style={{
          background: "radial-gradient(120% 100% at 50% 0%, #0e7a46 0%, #0a5e36 60%, #084c2c 100%)",
          border: "1px solid var(--border)",
          borderRadius: 18,
          padding: "1.1rem .6rem",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "rgba(255,255,255,.13)" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", width: 80, height: 80, transform: "translate(-50%,-50%)", border: "1px solid rgba(255,255,255,.13)", borderRadius: "50%" }} />
        <div style={{ position: "relative", display: "grid", gap: 10 }}>
          {POS_ROWS.map((P) => {
            const row = starterSlots.filter((s) => s.pos === P);
            if (!row.length) return null;
            return (
              <div key={P} style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                {row.map((s) =>
                  s.player ? (
                    <PlayerChip key={s.i} p={s.player} onClick={() => setViewing({ p: s.player!, source: "squad", slotIndex: s.i })} />
                  ) : (
                    <EmptySlot key={s.i} pos={P} />
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* bench */}
      {subSlots.length > 0 && (
        <div>
          <div style={{ fontSize: ".72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Bench</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {subSlots.map((s) =>
              s.player ? (
                <PlayerChip key={s.i} p={s.player} small onClick={() => setViewing({ p: s.player!, source: "squad", slotIndex: s.i })} />
              ) : (
                <EmptySlot key={s.i} pos="SUB" small />
              )
            )}
          </div>
        </div>
      )}

      {/* status bar */}
      <div className="card" style={{ padding: ".8rem 1rem", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: ".68rem", color: "var(--muted)", textTransform: "uppercase" }}>Squad</div>
          <div style={{ fontWeight: 800 }}>{squad.filter((s) => s.player).length}/{squad.length}</div>
        </div>
        <div>
          <div style={{ fontSize: ".68rem", color: "var(--muted)", textTransform: "uppercase" }}>Rating</div>
          <div style={{ fontWeight: 900, fontSize: "1.2rem", color: t.color }}>{rating ? rating.toFixed(1) : "—"}</div>
        </div>
        {mode === "cap" && (
          <div>
            <div style={{ fontSize: ".68rem", color: "var(--muted)", textTransform: "uppercase" }}>Spend</div>
            <div style={{ fontWeight: 800, color: overBudget ? "var(--danger)" : "var(--text)" }}>£{spend}/{cfg.cap}m</div>
          </div>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn" onClick={reset}>↺ Reset</button>
          {full && (
            <button className="btn btn-primary" onClick={simulate} disabled={overBudget}>▶ Simulate season</button>
          )}
        </div>
      </div>

      {overBudget && (
        <div style={{ color: "var(--danger)", fontWeight: 700, textAlign: "center" }}>
          £{spend - (cfg.cap ?? 0)}m over budget — remove a player or pick cheaper ones.
        </div>
      )}

      {/* spin / pick panel */}
      {!full && (
        <div className="card" style={{ padding: "1rem", display: "grid", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="chip" style={{ fontWeight: 800, fontSize: ".9rem" }}>📅 {year ? `${year}/${(Number(year) + 1) % 100}` : "…"}</span>
              {team && (
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://resources.premierleague.com/premierleague25/badges/${team.id}.svg`} alt="" width={22} height={22} />
                  {team.name}
                </span>
              )}
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button className="btn" onClick={respinClub} disabled={clubRe <= 0 || spinning}>🔄 Club ({clubRe})</button>
              <button className="btn" onClick={respinYear} disabled={yearRe <= 0 || spinning}>📅 Year ({yearRe})</button>
            </div>
          </div>

          {/* position filters + still-need hint */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="chip"
                style={{ cursor: "pointer", color: filter === f ? "#04220f" : "var(--text)", background: filter === f ? "var(--accent)" : "var(--panel-2)" }}
              >
                {f}
              </button>
            ))}
            <span style={{ marginLeft: "auto", fontSize: ".76rem", color: "var(--muted)" }}>
              Still need: {Object.entries(need).map(([p, n]) => `${n} ${p}`).join(" · ") || "—"}
            </span>
          </div>

          <p style={{ margin: 0, color: "var(--muted)", fontSize: ".85rem" }}>
            Tap a player to view their stats and add them to a position. Versatile players (★) can fill more than one slot.
          </p>

          <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", maxHeight: 320, overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
            {filtered.map((p) => {
              const usable = !seen.has(p.id) && openSlotsFor(p).length > 0;
              const versatile = eligOf(p).length > 1;
              return (
                <button
                  key={p.id}
                  onClick={() => setViewing({ p, source: "roster" })}
                  disabled={!usable}
                  className="card"
                  style={{
                    padding: ".5rem .6rem",
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    cursor: usable ? "pointer" : "not-allowed",
                    opacity: usable ? 1 : 0.4,
                    textAlign: "left",
                    color: "var(--text)",
                  }}
                >
                  <span style={{ fontWeight: 900, color: "var(--accent)", minWidth: 30 }}>{p.rating.toFixed(0)}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ fontWeight: 700, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.name} {versatile && <span title="Versatile" style={{ color: "var(--gold)" }}>★</span>}
                    </span>
                    <span style={{ color: "var(--muted)", fontSize: ".72rem" }}>{natOf(p)} · {p.g}G {p.a}A{mode === "cap" ? ` · £${salaryOf(p.rating)}m` : ""}</span>
                  </span>
                </button>
              );
            })}
            {filtered.length === 0 && <p style={{ color: "var(--muted)", gridColumn: "1/-1" }}>No {filter} players in this squad — try another filter or re-spin.</p>}
          </div>
        </div>
      )}

      {rating > 0 && !result && <div style={{ textAlign: "center", color: t.color, fontWeight: 700 }}>{t.label} side</div>}

      {result && <ResultPanel result={result} rating={rating} mode={mode} />}

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
  return (
    <div
      style={{
        width: small ? 92 : 104,
        minHeight: small ? 58 : 92,
        borderRadius: 10,
        border: "1px dashed rgba(255,255,255,.3)",
        display: "grid",
        placeItems: "center",
        color: "rgba(255,255,255,.65)",
        fontWeight: 800,
        fontSize: ".8rem",
        background: "rgba(0,0,0,.18)",
      }}
    >
      {pos}
    </div>
  );
}

function PlayerChip({ p, small, onClick }: { p: Pick; small?: boolean; onClick: () => void }) {
  const secondary = p.slot !== "SUB" && p.slot !== natOf(p);
  return (
    <button
      onClick={onClick}
      className="card"
      style={{ padding: small ? ".3rem .5rem" : ".4rem .6rem", textAlign: "center", minWidth: small ? 92 : 104, background: "rgba(10,14,26,.8)", color: "var(--text)", cursor: "pointer" }}
      title={`${p.name} — ${p.fromTeam} ${p.fromYear}`}
    >
      <div style={{ fontWeight: 900, color: "var(--accent)", fontSize: small ? ".9rem" : "1rem" }}>
        {effRating(p, p.slot).toFixed(0)}
        {p.slot !== "SUB" && <span style={{ fontSize: ".6rem", color: secondary ? "var(--gold)" : "var(--muted)", marginLeft: 3 }}>{p.slot}{secondary ? "*" : ""}</span>}
      </div>
      <div style={{ fontWeight: 700, fontSize: small ? ".7rem" : ".76rem", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: small ? 84 : 96 }}>{p.name}</div>
      <div style={{ color: "var(--muted)", fontSize: ".64rem" }}>{p.fromTeam} {String(p.fromYear).slice(2)}</div>
    </button>
  );
}

const POS_NAME: Record<SlotPos, string> = { GK: "Goalkeeper", DEF: "Defender", MID: "Midfielder", FWD: "Forward", SUB: "Bench" };

function PlayerModal({
  v,
  openSlots,
  year,
  team,
  onAdd,
  onRemove,
  onClose,
}: {
  v: { p: HistPlayer; source: "roster" | "squad"; slotIndex?: number };
  openSlots: SlotPos[];
  year: string;
  team: string;
  onAdd: (p: HistPlayer, slot: SlotPos) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const p = v.p;
  const age = p.born ? Number(year) - p.born : null;
  const boost = vBoost(p);
  const photo = `https://resources.premierleague.com/premierleague25/photos/players/110x140/${p.id}.png`;
  const stats: [string, string | number][] = [
    ["Rating", p.rating.toFixed(1)],
    ["Goals", p.g],
    ["Assists", p.a],
    ["Appearances", p.apps],
    ["Clean sheets", p.cs],
  ];
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "grid", placeItems: "center", zIndex: 100, padding: "1rem" }}
    >
      <div onClick={(e) => e.stopPropagation()} className="card pop" style={{ width: "min(420px,100%)", padding: "1.25rem", maxHeight: "85dvh", overflowY: "auto" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" width={64} height={80} loading="lazy" style={{ borderRadius: 10, background: "var(--panel-2)", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }} />
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: "1.2rem" }}>{p.name}</h3>
            <div style={{ color: "var(--muted)", fontSize: ".85rem" }}>
              {team} · {year}/{(Number(year) + 1) % 100}
            </div>
            <div style={{ color: "var(--muted)", fontSize: ".85rem" }}>
              {POS_NAME[natOf(p)]}{p.nat ? ` · ${p.nat}` : ""}{age ? ` · ${age}y` : ""}{p.shirt ? ` · #${p.shirt}` : ""}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6, margin: "1rem 0" }}>
          {stats.map(([l, val]) => (
            <div key={l} style={{ background: "var(--panel-2)", borderRadius: 8, padding: ".5rem .3rem", textAlign: "center" }}>
              <div style={{ fontWeight: 900, color: "var(--accent)" }}>{val}</div>
              <div style={{ fontSize: ".6rem", color: "var(--muted)", textTransform: "uppercase" }}>{l}</div>
            </div>
          ))}
        </div>

        {boost > 1 && (
          <div className="chip" style={{ color: "var(--gold)", marginBottom: 12 }}>
            ★ Versatile — can play {eligOf(p).join(", ")} · ×{boost.toFixed(2)} bench boost
          </div>
        )}

        {v.source === "roster" ? (
          openSlots.length > 0 ? (
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: ".75rem", color: "var(--muted)", textTransform: "uppercase" }}>Add to position</div>
              {openSlots.map((slot) => {
                const secondary = slot !== "SUB" && slot !== natOf(p);
                return (
                  <button key={slot} className="btn btn-primary" onClick={() => onAdd(p, slot)} style={{ justifyContent: "space-between" }}>
                    <span>{POS_NAME[slot]}{secondary ? " (out of position)" : ""}</span>
                    <strong>{effRating(p, slot).toFixed(0)}</strong>
                  </button>
                );
              })}
            </div>
          ) : (
            <p style={{ color: "var(--muted)", margin: 0 }}>No open slot fits this player right now.</p>
          )
        ) : (
          <button className="btn" onClick={onRemove} style={{ width: "100%", color: "var(--danger)" }}>Remove from squad</button>
        )}

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
    const txt = `My ${MODES[mode].label} Invincibles XI (${rating.toFixed(1)}): ${W}W ${D}D ${L}L${perfect ? " — PERFECT SEASON! 🌟" : unbeaten ? " — INVINCIBLE! 🏆" : ""}\nfootballinvincibles.com/games/invincibles`;
    navigator.clipboard?.writeText(txt).catch(() => {});
  };

  return (
    <div className="card pop" style={{ padding: "1.25rem", display: "grid", gap: 14 }}>
      {unbeaten && <Confetti />}
      <div style={{ textAlign: "center" }}>
        {perfect ? (
          <h2 style={{ fontSize: "2rem", margin: 0, color: "var(--gold)", fontWeight: 900 }}>🌟 PERFECT SEASON! 🌟</h2>
        ) : unbeaten ? (
          <h2 style={{ fontSize: "2rem", margin: 0, color: "var(--gold)", fontWeight: 900 }}>🏆 INVINCIBLE! 🏆</h2>
        ) : (
          <h2 style={{ fontSize: "1.5rem", margin: 0, fontWeight: 900 }}>{L} defeat{L === 1 ? "" : "s"} — not quite</h2>
        )}
        <p style={{ color: "var(--muted)", margin: ".25rem 0 0" }}>A representative season for your {rating.toFixed(1)}-rated squad.</p>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <Stat label="Won" value={W} />
        <Stat label="Drawn" value={D} />
        <Stat label="Lost" value={L} color="var(--danger)" />
        <Stat label="Points" value={W * 3 + D} />
        <Stat label="Unbeaten odds" value={invLabel} />
      </div>

      <div>
        <div style={{ fontSize: ".72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>The 38-game story</div>
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {story.map((g, i) => (
            <span key={i} title={`MW${g.round}: ${g.home ? "vs" : "@"} ${g.oppName} — ${g.result}`} style={{ width: 22, height: 22, display: "grid", placeItems: "center", borderRadius: 5, fontSize: ".62rem", fontWeight: 800, color: g.result === "L" ? "#fff" : "#04220f", background: g.result === "W" ? "var(--accent)" : g.result === "D" ? "var(--gold)" : "var(--danger)" }}>{g.result}</span>
          ))}
        </div>
      </div>

      <ScoreSubmit
        entries={unbeaten ? [{ game: "invincibles", score: W * 3 + D }, { game: "undefeated", score: W * 3 + D }] : [{ game: "invincibles", score: W * 3 + D }]}
        label={unbeaten ? "Post to the Wall" : "Submit score"}
      />

      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <button className="btn btn-primary" onClick={share}>📋 Share</button>
        <a className="btn" href="/leaderboard">🏆 Hall of Fame</a>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="card" style={{ padding: ".6rem 1rem", textAlign: "center", minWidth: 80 }}>
      <div style={{ fontSize: "1.4rem", fontWeight: 900, color: color ?? "var(--text)" }}>{value}</div>
      <div style={{ fontSize: ".66rem", color: "var(--muted)", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}
