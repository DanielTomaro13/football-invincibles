"use client";
import { useEffect, useRef, useState } from "react";
import { generateShareCard, type ShareLine } from "@/lib/shareCard";

const URL_ = "https://footballinvincibles.com/games/invincibles";

/**
 * Social share for an Invincibles result. Generates a team image and offers:
 * native share (Instagram & co. on mobile), X/Twitter, Facebook, and download.
 */
export default function ShareTeam({
  title,
  record,
  rating,
  mode,
  lines,
  gold,
}: {
  title: string;
  record: string;
  rating: number;
  mode: string;
  lines: ShareLine[];
  gold: boolean;
}) {
  const [img, setImg] = useState<Blob | null>(null);
  const text = `${title === "INVINCIBLE!" || title.includes("PERFECT") ? title + " " : ""}My ${mode} Invincibles XI (${rating.toFixed(1)}) — ${record}. Build yours:`;
  const fileRef = useRef<File | null>(null);

  useEffect(() => {
    generateShareCard({ title, record, rating, mode, lines, gold }).then((b) => {
      setImg(b);
      if (b) fileRef.current = new File([b], "my-invincibles-xi.png", { type: "image/png" });
    });
  }, [title, record, rating, mode, lines, gold]);

  const native = async () => {
    const f = fileRef.current;
    const nav = navigator as any;
    if (f && nav.canShare?.({ files: [f] })) {
      try {
        await nav.share({ files: [f], text, url: URL_ });
        return;
      } catch {}
    }
    download();
    window.open("https://www.instagram.com/", "_blank");
  };

  const download = () => {
    if (!img) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(img);
    a.download = "my-invincibles-xi.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const tweet = () =>
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(URL_)}`, "_blank", "noopener");
  const facebook = () =>
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(URL_)}&quote=${encodeURIComponent(text)}`, "_blank", "noopener");

  const btn: React.CSSProperties = { flex: "1 1 110px", justifyContent: "center" };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ fontSize: ".72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em", textAlign: "center" }}>
        Share your team
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn" style={{ ...btn, background: "linear-gradient(45deg,#feda75,#d62976,#962fbf)", color: "#fff", borderColor: "transparent" }} onClick={native} disabled={!img}>
          📸 Instagram
        </button>
        <button className="btn" style={{ ...btn, background: "#1d9bf0", color: "#fff", borderColor: "transparent" }} onClick={tweet}>
          𝕏 / Twitter
        </button>
        <button className="btn" style={{ ...btn, background: "#1877f2", color: "#fff", borderColor: "transparent" }} onClick={facebook}>
          f Facebook
        </button>
        <button className="btn" style={btn} onClick={download} disabled={!img}>
          ⬇ Image
        </button>
      </div>
    </div>
  );
}
