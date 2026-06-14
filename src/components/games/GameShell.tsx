import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { SITE } from "@/lib/seo";

/**
 * Server wrapper giving every game a consistent, SEO-friendly frame:
 * an H1, an intro paragraph, the interactive game, and a "how to play"
 * section — plus VideoGame/HowTo structured data.
 */
export default function GameShell({
  title,
  emoji,
  intro,
  howTo,
  children,
  slug,
}: {
  title: string;
  emoji: string;
  intro: string;
  howTo: string[];
  children: React.ReactNode;
  slug: string;
}) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: title,
    url: `${SITE.url}/games/${slug}`,
    applicationCategory: "Game",
    operatingSystem: "Web",
    gamePlatform: "Web browser",
    publisher: { "@type": "Organization", name: SITE.name },
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <JsonLd data={ld} />
      <nav style={{ fontSize: ".82rem", color: "var(--muted)" }}>
        <Link href="/games" style={{ color: "var(--accent)" }}>← All games</Link>
      </nav>
      <header style={{ display: "grid", gap: 6 }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: 0 }}>
          <span style={{ marginRight: 8 }}>{emoji}</span>
          {title}
        </h1>
        <p style={{ color: "var(--muted)", margin: 0, maxWidth: 680 }}>{intro}</p>
      </header>

      {children}

      <section className="card" style={{ padding: "1.25rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginTop: 0 }}>How to play</h2>
        <ol style={{ color: "var(--muted)", margin: 0, paddingLeft: "1.1rem", display: "grid", gap: 6 }}>
          {howTo.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
