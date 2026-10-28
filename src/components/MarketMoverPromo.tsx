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
    <aside role="dialog" aria-labelledby="mm-promo-title" className="mm-promo">
      <style>{`
        .mm-promo {
          position: fixed;
          z-index: 80;
          right: max(20px, env(safe-area-inset-right));
          bottom: calc(20px + env(safe-area-inset-bottom));
          left: auto;
          width: min(560px, 92vw);
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 16px;
          align-items: start;
          padding: 22px 16px 22px 22px;
          background: var(--panel, #161d2e);
          color: var(--text, #e8edf7);
          border: 1px solid var(--border, #26314d);
          border-radius: 18px;
          box-shadow: 0 22px 56px rgba(0, 0, 0, 0.5);
        }
        .mm-promo-mark {
          width: 72px;
          height: 72px;
          max-width: none;
          border-radius: 14px;
          display: block;
        }
        .mm-promo-copy {
          display: grid;
          gap: 12px;
          min-width: 0;
          padding-top: 2px;
        }
        .mm-promo-title {
          margin: 0;
          font-size: 1.45rem;
          line-height: 1.15;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .mm-promo-body {
          margin: 0;
          font-size: 1.0625rem;
          line-height: 1.45;
          color: var(--muted, #93a0bd);
        }
        .mm-promo-cta {
          justify-self: start;
          min-height: 48px;
          min-width: 48px;
          padding: 0.75rem 1.35rem;
          font-size: 1.05rem;
          border-radius: 12px;
        }
        .mm-promo-dismiss {
          border: 0;
          background: transparent;
          color: var(--muted, #93a0bd);
          width: 44px;
          height: 44px;
          margin: -6px -4px 0 0;
          font-size: 1.75rem;
          line-height: 1;
          padding: 0;
          cursor: pointer;
          border-radius: 12px;
        }
        .mm-promo-dismiss:hover {
          color: var(--text, #e8edf7);
          background: var(--panel-2, #1d2740);
        }
        /* Phones: nearly the full width, with room for the home indicator and notch. */
        @media (max-width: 700px) {
          .mm-promo {
            left: max(8px, env(safe-area-inset-left));
            right: max(8px, env(safe-area-inset-right));
            width: auto;
            gap: 12px;
            padding: 18px 10px 18px 16px;
          }
          .mm-promo-mark { width: 60px; height: 60px; }
          .mm-promo-title { font-size: 1.5rem; }
          .mm-promo-body { font-size: 1.125rem; }
          .mm-promo-cta {
            justify-self: stretch;
            width: 100%;
            min-height: 48px;
            font-size: 1.125rem;
          }
          .mm-promo-dismiss {
            width: 48px;
            height: 48px;
            margin: -8px -2px 0 0;
            font-size: 1.85rem;
          }
        }
        /* iPad and other iOS tablets stay nearly full-bleed too (coarse pointer + WebKit). */
        @supports (-webkit-touch-callout: none) {
          @media (pointer: coarse) {
            .mm-promo {
              left: max(8px, env(safe-area-inset-left));
              right: max(8px, env(safe-area-inset-right));
              bottom: calc(12px + env(safe-area-inset-bottom));
              width: auto;
              max-width: none;
              gap: 14px;
              padding: 20px 12px 20px 18px;
            }
            .mm-promo-mark { width: 64px; height: 64px; }
            .mm-promo-title { font-size: 1.6rem; }
            .mm-promo-body { font-size: 1.15rem; line-height: 1.4; }
            .mm-promo-cta {
              justify-self: stretch;
              width: 100%;
              min-height: 48px;
              font-size: 1.125rem;
            }
            .mm-promo-dismiss {
              width: 48px;
              height: 48px;
              min-width: 48px;
              min-height: 48px;
              font-size: 1.85rem;
            }
          }
        }
      `}</style>
      <img
        src="/marketmover-mark.png"
        alt=""
        width={72}
        height={72}
        className="mm-promo-mark"
      />
      <div className="mm-promo-copy">
        <p id="mm-promo-title" className="mm-promo-title">
          MarketMover
        </p>
        <p className="mm-promo-body">
          Live prices and model markets in one place. More markets coming.
        </p>
        <a
          href={HREF}
          target="_blank"
          rel="noopener noreferrer"
          onClick={dismiss}
          className="btn btn-primary mm-promo-cta"
        >
          Open MarketMover
        </a>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss for 14 days"
        className="mm-promo-dismiss"
      >
        ×
      </button>
    </aside>
  );
}
