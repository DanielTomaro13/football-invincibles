"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const DISMISS_KEY = "marketmover-promo-dismissed-until";
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;
const DELAY_MS = 1500;
const HREF =
  "https://www.marketmover.net?utm_source=football-invincibles&utm_medium=popup&utm_campaign=crosspromo";

/** Home and the flagship Invincibles game. Trailing slash is stripped (static export). */
function showOnPath(pathname: string) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return path === "/" || path === "/games/invincibles";
}

function stillDismissed() {
  try {
    return Number(localStorage.getItem(DISMISS_KEY) || 0) > Date.now();
  } catch {
    return false;
  }
}

function rememberDismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
  } catch {
    /* private mode */
  }
}

export default function MarketMoverPromo() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!showOnPath(pathname) || stillDismissed()) {
      setOpen(false);
      return;
    }
    const t = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      rememberDismiss();
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open || !showOnPath(pathname)) return null;

  function dismiss() {
    rememberDismiss();
    setOpen(false);
  }

  return (
    <aside
      role="dialog"
      aria-label="MarketMover"
      style={{
        position: "fixed",
        zIndex: 80,
        right: 16,
        bottom: "calc(16px + env(safe-area-inset-bottom))",
        left: 16,
        maxWidth: 380,
        marginLeft: "auto",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 10,
        alignItems: "start",
        padding: "12px 12px 12px 14px",
        background: "var(--panel,#161d2e)",
        color: "var(--text,#e8edf7)",
        border: "1px solid var(--border,#26314d)",
        borderRadius: 14,
        boxShadow: "0 16px 40px rgba(0,0,0,.45)",
      }}
    >
      <img
        src="/marketmover-mark.png"
        alt=""
        width={36}
        height={36}
        style={{ width: 36, height: 36, maxWidth: "none", borderRadius: 8, display: "block" }}
      />
      <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: ".9rem", lineHeight: 1.35 }}>
          MarketMover — live prices and model markets in one place. More markets coming.
        </p>
        <a
          href={HREF}
          target="_blank"
          rel="noopener noreferrer"
          onClick={dismiss}
          className="btn btn-primary"
          style={{ justifySelf: "start", minHeight: 36, padding: "0.35rem 0.8rem", fontSize: ".85rem" }}
        >
          Open MarketMover
        </a>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss for 14 days"
        style={{
          border: 0,
          background: "transparent",
          color: "var(--muted,#93a0bd)",
          fontSize: "1.15rem",
          lineHeight: 1,
          padding: 2,
          cursor: "pointer",
        }}
      >
        ×
      </button>
    </aside>
  );
}
