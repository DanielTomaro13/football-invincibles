"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { safeId } from "@/lib/ids";

export interface BrowsePlayer {
  id: number | string;
  name: string;
  team: string;
  pos: string;
  nat: string | null;
  g: number;
  a: number;
  apps: number;
  photo: string;
  lk?: number; // has a static profile page
}

const POS = ["All", "Goalkeeper", "Defender", "Midfielder", "Forward"];

export default function PlayersBrowser({ players, linkable = true, compSlug = "premier-league" }: { players: BrowsePlayer[]; linkable?: boolean; compSlug?: string }) {
  const [q, setQ] = useState("");
  const [pos, setPos] = useState("All");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return players
      .filter((p) => (pos === "All" ? true : p.pos === pos))
      .filter((p) =>
        term
          ? p.name.toLowerCase().includes(term) ||
            p.team.toLowerCase().includes(term) ||
            (p.nat ?? "").toLowerCase().includes(term)
          : true
      )
      .slice(0, 120);
  }, [q, pos, players]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search player, club or nation…"
          style={{
            flex: "1 1 240px",
            padding: ".65rem .9rem",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--panel)",
            color: "var(--text)",
          }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {POS.map((p) => (
            <button
              key={p}
              onClick={() => setPos(p)}
              className="chip"
              style={{
                cursor: "pointer",
                color: pos === p ? "#04220f" : "var(--text)",
                background: pos === p ? "var(--accent)" : "var(--panel-2)",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))" }}>
        {filtered.map((p) => {
          const inner = (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.photo}
                alt={p.name}
                width={44}
                height={44}
                loading="lazy"
                style={{ borderRadius: "50%", background: "var(--panel-2)", objectFit: "cover" }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                <div style={{ color: "var(--muted)", fontSize: ".8rem" }}>{p.team} · {p.pos.slice(0, 3)} · {p.g}G {p.a}A</div>
              </div>
            </>
          );
          const style = { padding: ".8rem", display: "flex", gap: 10, alignItems: "center" } as const;
          return linkable && p.lk ? (
            <Link key={String(p.id)} href={`/player/${compSlug}/${safeId(p.id)}`} className="card" style={style}>{inner}</Link>
          ) : (
            <div key={String(p.id)} className="card" style={style}>{inner}</div>
          );
        })}
      </div>
      {filtered.length === 0 && <p style={{ color: "var(--muted)" }}>No players match.</p>}
    </div>
  );
}
