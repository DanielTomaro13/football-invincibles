"use client";
import { useEffect, useState } from "react";
import { getDaily, countdownString, type DailyStats } from "@/lib/progress";

/** Stats panel shown after a daily puzzle: streak, distribution, countdown, share. */
export default function DailyStatsPanel({
  game,
  shareText,
}: {
  game: string;
  shareText: string;
}) {
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [countdown, setCountdown] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setStats(getDaily(game));
    const t = setInterval(() => setCountdown(countdownString()), 1000);
    setCountdown(countdownString());
    return () => clearInterval(t);
  }, [game]);

  if (!stats) return null;
  const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
  const maxDist = Math.max(1, ...Object.values(stats.dist));

  const share = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="card pop" style={{ padding: "1.25rem", display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
        <Num v={stats.played} label="Played" />
        <Num v={`${winPct}%`} label="Win" />
        <Num v={stats.cur} label="Streak" />
        <Num v={stats.max} label="Max streak" />
      </div>

      <div>
        <div style={{ fontSize: ".72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>
          Guess distribution
        </div>
        <div style={{ display: "grid", gap: 3 }}>
          {Array.from({ length: 8 }, (_, i) => i + 1).map((g) => {
            const c = stats.dist[g] ?? 0;
            return (
              <div key={g} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: ".8rem" }}>
                <span style={{ width: 12, color: "var(--muted)" }}>{g}</span>
                <div
                  style={{
                    width: `${Math.max(8, (c / maxDist) * 100)}%`,
                    background: c ? "var(--accent)" : "var(--panel-2)",
                    color: "#04220f",
                    borderRadius: 4,
                    padding: "1px 6px",
                    textAlign: "right",
                    fontWeight: 700,
                    minWidth: 22,
                  }}
                >
                  {c}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ fontSize: ".85rem", color: "var(--muted)" }}>
          Next puzzle in <strong style={{ color: "var(--text)" }}>{countdown}</strong>
        </div>
        <button className="btn btn-primary" onClick={share}>
          {copied ? "Copied!" : "📋 Share result"}
        </button>
      </div>
    </div>
  );
}

function Num({ v, label }: { v: number | string; label: string }) {
  return (
    <div>
      <div style={{ fontSize: "1.6rem", fontWeight: 900 }}>{v}</div>
      <div style={{ fontSize: ".66rem", color: "var(--muted)", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}
