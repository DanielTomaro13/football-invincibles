import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ textAlign: "center", padding: "3rem 1rem", display: "grid", gap: 16, justifyItems: "center" }}>
      <div style={{ fontSize: "3rem" }}>⚽</div>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 900, margin: 0 }}>Page not found</h1>
      <p style={{ color: "var(--muted)", maxWidth: 460, margin: 0 }}>
        That page doesn&apos;t exist. Browse the tables, players and games instead.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <Link href="/" className="btn btn-primary">Home</Link>
        <Link href="/players" className="btn">Players</Link>
        <Link href="/tables" className="btn">Tables</Link>
        <Link href="/games" className="btn">Games</Link>
      </div>
    </div>
  );
}
