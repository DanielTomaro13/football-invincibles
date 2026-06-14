"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { topScores, type ScoreEntry } from "@/lib/leaderboard";
import { dailyDateKey } from "@/lib/games-data";
import { useCompetition } from "@/components/CompetitionProvider";

/** Today's Daily Challenge leaderboard for the active league (resets at midnight UTC). */
export default function DailyLeaderboard({ limit = 8 }: { limit?: number }) {
  const { comp } = useCompetition();
  const [rows, setRows] = useState<ScoreEntry[]>([]);

  useEffect(() => {
    topScores(`daily:${comp.slug}:${dailyDateKey()}`, true, limit).then(setRows).catch(() => setRows([]));
  }, [comp.slug, limit]);

  return (
    <div className="card" style={{ padding: "1rem", borderColor: "var(--accent)" }}>
      <div style={{ marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: "1.05rem" }}>🗓️ Today&apos;s Daily — {comp.shortName}</h3>
        <div style={{ color: "var(--muted)", fontSize: ".8rem" }}>Same teams for everyone · resets at midnight UTC</div>
      </div>
      {rows.length === 0 ? (
        <Link href="/games/invincibles" style={{ color: "var(--accent)", fontWeight: 600, fontSize: ".9rem" }}>
          Be the first to post a score today →
        </Link>
      ) : (
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 2 }}>
          {rows.map((e, i) => (
            <li key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 2px", fontSize: ".9rem" }}>
              <span style={{ width: 20, textAlign: "center", fontWeight: 800, color: i === 0 ? "var(--gold)" : "var(--muted)" }}>{i === 0 ? "👑" : i + 1}</span>
              <span style={{ flex: 1, fontWeight: 600 }}>{e.name}</span>
              <strong style={{ color: "var(--accent)" }}>{e.score} pts</strong>
            </li>
          ))}
        </ol>
      )}
      <Link href="/games/invincibles" style={{ display: "inline-block", marginTop: 10, color: "var(--accent)", fontSize: ".85rem", fontWeight: 600 }}>
        Play today&apos;s Daily →
      </Link>
    </div>
  );
}
