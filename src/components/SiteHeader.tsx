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
    <header
      style={{
        borderBottom: "1px solid var(--border)",
        background: "rgba(10,14,26,0.85)",
        backdropFilter: "blur(8px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        className="container-x"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1.25rem",
          height: 60,
        }}
      >
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}
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
          <span>
            Football <span style={{ color: "var(--accent)" }}>Invincibles</span>
          </span>
        </Link>
        <nav
          style={{ display: "flex", gap: 4, marginLeft: "auto", flexWrap: "wrap" }}
        >
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="chip"
              style={{ color: "var(--text)" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
