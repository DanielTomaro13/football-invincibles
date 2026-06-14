import Link from "next/link";
import { SITE } from "@/lib/seo";

export default function SiteFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        marginTop: "4rem",
        padding: "2rem 0",
        paddingBottom: "calc(2rem + env(safe-area-inset-bottom))",
        color: "var(--muted)",
      }}
    >
      <div
        className="container-x"
        style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}
      >
        <div style={{ maxWidth: 320 }}>
          <strong style={{ color: "var(--text)" }}>{SITE.name}</strong>
          <p style={{ fontSize: ".85rem", marginTop: 6 }}>{SITE.tagline}</p>
          <a
            href="https://ko-fi.com/danieltomaro"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, padding: ".45rem .8rem", borderRadius: 8, background: "#13C3FF", color: "#04220f", fontWeight: 800, fontSize: ".85rem" }}
          >
            ☕ Support on Ko-fi
          </a>
        </div>
        <div style={{ display: "flex", gap: "2.5rem", marginLeft: "auto", flexWrap: "wrap" }}>
          <nav style={{ display: "grid", gap: 6, fontSize: ".85rem" }}>
            <strong style={{ color: "var(--text)" }}>Explore</strong>
            <Link href="/tables">Tables</Link>
            <Link href="/stats">Stats</Link>
            <Link href="/players">Players</Link>
            <Link href="/matches">Fixtures</Link>
          </nav>
          <nav style={{ display: "grid", gap: 6, fontSize: ".85rem" }}>
            <strong style={{ color: "var(--text)" }}>Games</strong>
            <Link href="/games/invincibles">Invincibles</Link>
            <Link href="/games/footle">Footle</Link>
            <Link href="/games/higher-or-lower">Higher or Lower</Link>
            <Link href="/leaderboard">Hall of Fame</Link>
          </nav>
          <nav style={{ display: "grid", gap: 6, fontSize: ".85rem" }}>
            <strong style={{ color: "var(--text)" }}>Site</strong>
            <Link href="/about">About</Link>
            <Link href="/competitions">Competitions</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy Policy</Link>
          </nav>
        </div>
      </div>
      <div
        className="container-x"
        style={{ marginTop: "1.5rem", fontSize: ".78rem", opacity: 0.7 }}
      >
        © {new Date().getFullYear()} {SITE.name}. Unofficial — not affiliated with the
        Premier League, LaLiga or any club. Data for informational and entertainment use.{" "}
        <Link href="/privacy" style={{ color: "var(--muted)" }}>Privacy</Link> ·{" "}
        <Link href="/about" style={{ color: "var(--muted)" }}>About</Link> ·{" "}
        <Link href="/contact" style={{ color: "var(--muted)" }}>Contact</Link>
      </div>
    </footer>
  );
}
