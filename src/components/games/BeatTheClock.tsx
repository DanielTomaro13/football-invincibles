"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadGamesData, type GamePlayer } from "@/lib/games-data";
import { slugify } from "@/lib/format";
import { recordScore } from "@/lib/progress";
import ScoreSubmit from "@/components/games/ScoreSubmit";

const GAME = "beat-the-clock";
const DURATION = 60;
const TARGET_COUNT = 30;

export default function BeatTheClock() {
  const [pool, setPool] = useState<GamePlayer[]>([]);
  const [started, setStarted] = useState(false);
  const [time, setTime] = useState(DURATION);
  const [found, setFound] = useState<GamePlayer[]>([]);
  const [query, setQuery] = useState("");
  const [flash, setFlash] = useState<"hit" | "miss" | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadGamesData().then((d) => {
      const top = [...d.players].sort((a, b) => b.g - a.g).slice(0, TARGET_COUNT);
      setPool(top);
    });
  }, []);

  useEffect(() => {
    if (!started) return;
    timer.current = setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          if (timer.current) clearInterval(timer.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [started]);

  const foundIds = useMemo(() => new Set(found.map((f) => f.id)), [found]);
  const over = started && time === 0;

  useEffect(() => {
    if (over) recordScore(GAME, found.length); // personal best (local)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over]);

  const check = (val: string) => {
    const norm = slugify(val);
    const match = pool.find((p) => slugify(p.name) === norm || slugify(p.name).includes(norm) && norm.length > 3);
    if (match && !foundIds.has(match.id)) {
      setFound((f) => [match, ...f]);
      setQuery("");
      setFlash("hit");
    } else {
      setFlash("miss");
    }
    setTimeout(() => setFlash(null), 250);
  };

  const start = () => {
    setStarted(true);
    setTime(DURATION);
    setFound([]);
  };

  if (!pool.length) return <p style={{ color: "var(--muted)" }}>Loading…</p>;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="chip">Found: {found.length}/{TARGET_COUNT}</span>
        <span className="chip" style={{ color: time <= 10 ? "var(--danger)" : "var(--text)", fontWeight: 800 }}>⏱ {time}s</span>
      </div>

      {!started ? (
        <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
          <p style={{ marginTop: 0 }}>Name as many of the season&apos;s top {TARGET_COUNT} scorers as you can in {DURATION} seconds.</p>
          <button className="btn btn-primary" onClick={start}>Start</button>
        </div>
      ) : (
        <>
          {!over && (
            <input
              value={query}
              autoFocus
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && query.trim()) check(query);
              }}
              placeholder="Type a top scorer & press Enter…"
              style={{
                width: "100%",
                padding: ".7rem .9rem",
                borderRadius: 10,
                border: `1px solid ${flash === "hit" ? "var(--accent)" : flash === "miss" ? "var(--danger)" : "var(--border)"}`,
                background: "var(--panel)",
                color: "var(--text)",
              }}
            />
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 6 }}>
            {pool.map((p) => {
              const got = foundIds.has(p.id);
              const show = got || over;
              return (
                <div
                  key={p.id}
                  className="card"
                  style={{
                    padding: ".45rem .6rem",
                    fontSize: ".82rem",
                    display: "flex",
                    justifyContent: "space-between",
                    opacity: show ? 1 : 0.5,
                    borderColor: got ? "var(--accent)" : "var(--border)",
                    color: !got && over ? "var(--danger)" : "var(--text)",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{show ? p.name : "•••••"}</span>
                  <span style={{ color: "var(--muted)" }}>{show ? `${p.g}` : "?"}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {over && (
        <div className="card pop" style={{ padding: "1.25rem", textAlign: "center", display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Time! You named {found.length} of {TARGET_COUNT}</h2>
          {found.length > 0 && <ScoreSubmit entries={[{ game: GAME, score: found.length }]} />}
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={start}>Play again</button>
            <a className="btn" href="/leaderboard">🏆 Leaderboard</a>
          </div>
        </div>
      )}
    </div>
  );
}
