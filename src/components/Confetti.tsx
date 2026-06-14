"use client";
import { useEffect, useState } from "react";

const COLORS = ["#00e676", "#38bdf8", "#ffd166", "#ff5d73", "#a78bfa"];

/** Lightweight CSS confetti burst. Mounts, rains, unmounts. */
export default function Confetti({ count = 90 }: { count?: number }) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setOn(false), 4000);
    return () => clearTimeout(t);
  }, []);
  if (!on) return null;
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 100, overflow: "hidden" }} aria-hidden>
      {Array.from({ length: count }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.6;
        const dur = 2.4 + Math.random() * 1.6;
        const size = 6 + Math.random() * 7;
        const color = COLORS[i % COLORS.length];
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              top: "-5%",
              left: `${left}%`,
              width: size,
              height: size * 0.5,
              background: color,
              borderRadius: 2,
              animation: `fi-fall ${dur}s ${delay}s linear forwards`,
            }}
          />
        );
      })}
      <style>{`@keyframes fi-fall{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(105vh) rotate(720deg);opacity:.9}}`}</style>
    </div>
  );
}
