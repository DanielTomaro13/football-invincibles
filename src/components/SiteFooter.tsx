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
            <Link href="/leaderboard">Hall of Fame</Link>
            <Link href="/competitions">Competitions</Link>
          </nav>
        </div>
      </div>
      <div
        className="container-x"
        style={{ marginTop: "1.5rem", fontSize: ".78rem", opacity: 0.7 }}
      >
        © {new Date().getFullYear()} {SITE.name}. Unofficial. Not affiliated with
        the Premier League. Data for informational and entertainment use.
      </div>
    </footer>
  );
}
