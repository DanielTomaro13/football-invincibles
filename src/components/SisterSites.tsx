/**
 * Cross-site strip linking the sister projects (the "0 Series") plus MarketMover.
 * The same bar lives at the top of the sister sites so they point at one another.
 * Self-contained inline styles — no global CSS needed.
 */
const SITES: { key: string; label: string; href: string; logo?: string }[] = [
  { key: "afl", label: "AFL 23-0", href: "https://afl23-0.com" },
  { key: "nrl", label: "NRL 24-0", href: "https://nrl24-0.com" },
  { key: "football", label: "Football Invincibles", href: "https://footballinvincibles.com" },
  { key: "f1", label: "F1 Slam", href: "https://f1slam.com" },
  { key: "mlb", label: "MLB 162-0", href: "https://mlb162-0.com" },
  { key: "nba", label: "NBA 82-0", href: "https://nba82-0.com" },
  { key: "nbl", label: "NBL 33-0", href: "https://nbl33-0.com" },
  { key: "tennis", label: "Tennis Slam", href: "https://grandtennisslam.com" },
  {
    key: "marketmover",
    label: "MarketMover",
    href: "https://www.marketmover.net?utm_source=football-invincibles&utm_medium=sister_bar&utm_campaign=crosspromo",
    logo: "/marketmover-mark.png",
  },
];

export default function SisterSites({ active }: { active: "afl" | "nrl" | "football" }) {
  return (
    <div
      role="navigation"
      aria-label="Sister sites"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        fontSize: ".74rem",
        padding: "5px 0.6rem",
        paddingTop: "calc(5px + env(safe-area-inset-top))",
        background: "#06080f",
        borderBottom: "1px solid var(--border,#26314d)",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        overscrollBehaviorX: "contain",
        scrollbarWidth: "none",
      }}
    >
      <span style={{ color: "var(--muted,#93a0bd)", marginRight: 2, fontWeight: 700, fontSize: ".7rem" }}>THE 0 SERIES ·</span>
      {SITES.map((s) =>
        s.key === active ? (
          <span key={s.key} aria-current="page" style={{ whiteSpace: "nowrap", padding: "3px 9px", borderRadius: 999, color: "var(--text,#e8edf7)", background: "var(--panel-2,#1d2740)", border: "1px solid var(--border,#26314d)", fontWeight: 600 }}>{s.label}</span>
        ) : (
          <a
            key={s.key}
            href={s.href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              whiteSpace: "nowrap",
              padding: "3px 9px",
              borderRadius: 999,
              color: "var(--muted,#93a0bd)",
              fontWeight: 600,
            }}
          >
            {s.logo ? (
              <img
                src={s.logo}
                alt=""
                width={14}
                height={14}
                style={{ width: 14, height: 14, maxWidth: "none", borderRadius: 3, display: "block" }}
              />
            ) : null}
            {s.label}
          </a>
        )
      )}
    </div>
  );
}
