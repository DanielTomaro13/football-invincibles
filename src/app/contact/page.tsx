import type { Metadata } from "next";
import { pageMeta, SITE } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Contact",
  description: `Get in touch with ${SITE.name} — feedback, data corrections, advertising and general enquiries.`,
  path: "/contact",
});

const EMAIL = "danieltomaro3@gmail.com";

export default function ContactPage() {
  return (
    <article style={{ maxWidth: 680, margin: "0 auto", display: "grid", gap: "1rem", lineHeight: 1.65 }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: 0 }}>Contact</h1>

      <p style={{ color: "var(--muted)" }}>
        {SITE.name} is run by an independent developer. We&apos;d genuinely love to hear from you — whether it&apos;s a
        bug, a feature idea, a data correction, an advertising question, or just to say a game was fun.
      </p>

      <div className="card" style={{ padding: "1.25rem", display: "grid", gap: 6 }}>
        <div style={{ fontSize: ".72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>Email</div>
        <a href={`mailto:${EMAIL}`} style={{ color: "var(--accent)", fontWeight: 800, fontSize: "1.1rem" }}>{EMAIL}</a>
        <p style={{ color: "var(--muted)", margin: ".25rem 0 0", fontSize: ".9rem" }}>We aim to reply within a few days.</p>
      </div>

      <section style={{ display: "grid", gap: 6 }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: ".4rem 0 0" }}>What to reach out about</h2>
        <ul style={{ margin: ".25rem 0", paddingLeft: "1.2rem", display: "grid", gap: 8, color: "var(--muted)" }}>
          <li><strong>Bugs &amp; feedback</strong> — anything broken or confusing.</li>
          <li><strong>Data corrections</strong> — a stat or rating that looks wrong.</li>
          <li><strong>Feature requests</strong> — a competition or game you&apos;d like to see.</li>
          <li><strong>Advertising &amp; partnerships</strong> — commercial enquiries.</li>
          <li><strong>Privacy</strong> — requests related to our <a href="/privacy" style={{ color: "var(--accent)" }}>Privacy Policy</a>.</li>
        </ul>
      </section>
    </article>
  );
}
