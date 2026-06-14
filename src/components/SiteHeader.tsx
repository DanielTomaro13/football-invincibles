import Link from "next/link";

const NAV = [
  { href: "/tables", label: "Tables" },
  { href: "/stats", label: "Stats" },
  { href: "/players", label: "Players" },
  { href: "/matches", label: "Fixtures" },
  { href: "/games", label: "Games" },
  { href: "/leaderboard", label: "Hall of Fame" },
  { href: "/competitions", label: "Competitions" },
];

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div
        className="container-x"
        style={{ display: "flex", alignItems: "center", gap: "0.75rem", height: 58 }}
      >
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, flexShrink: 0 }}
        >
          <span
            aria-hidden
            style={{
              display: "inline-grid",
              placeItems: "center",
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "linear-gradient(135deg,#00e676,#38bdf8)",
              color: "#04220f",
              fontWeight: 900,
            }}
          >
            FI
          </span>
          <span className="brand-text">
            Football <span style={{ color: "var(--accent)" }}>Invincibles</span>
          </span>
        </Link>
        <nav className="nav-strip" aria-label="Primary">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="nav-link">
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
