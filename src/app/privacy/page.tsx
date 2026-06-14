import type { Metadata } from "next";
import { pageMeta, SITE } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Privacy Policy",
  description: `How ${SITE.name} handles data, cookies and advertising. We don't require accounts and don't sell personal data.`,
  path: "/privacy",
});

const UPDATED = "14 June 2026";

export default function PrivacyPage() {
  return (
    <article style={{ maxWidth: 760, margin: "0 auto", display: "grid", gap: "1rem", lineHeight: 1.65 }}>
      <header>
        <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: "0 0 .25rem" }}>Privacy Policy</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>Last updated: {UPDATED}</p>
      </header>

      <p>
        This Privacy Policy explains how {SITE.name} (&quot;we&quot;, &quot;us&quot;), available at{" "}
        <strong>{SITE.domain}</strong>, handles information when you use the site. {SITE.name} is an independent
        football statistics and games website. We try to collect as little as possible: there are no user accounts and
        we never ask for your real name, email or payment details to play.
      </p>

      <Section title="Information we collect">
        <ul style={ul}>
          <li>
            <strong>Game data stored on your device.</strong> Your scores, streaks, daily-puzzle results and the
            nickname you optionally type for a leaderboard are saved in your browser&apos;s <em>localStorage</em>. This
            stays on your device; we can&apos;t read your other browsing data.
          </li>
          <li>
            <strong>Leaderboard submissions.</strong> If you choose to post a score, only the nickname you enter and the
            score are sent to our leaderboard service (a Cloudflare Worker). Don&apos;t enter personal information as a
            nickname — it may be shown publicly.
          </li>
          <li>
            <strong>Usage analytics.</strong> We use <strong>Cloudflare Web Analytics</strong>, which is
            privacy-first and <em>does not use cookies</em> or fingerprinting and does not track you across sites.
          </li>
          <li>
            <strong>Server logs.</strong> Like most websites and our hosting/CDN providers (GitHub Pages, Cloudflare),
            standard technical data such as IP address and browser type may be processed transiently to deliver the
            site and protect against abuse.
          </li>
        </ul>
      </Section>

      <Section title="Advertising &amp; cookies (Google AdSense)">
        <p>
          We show ads served by <strong>Google AdSense</strong> to keep the site free. In connection with this:
        </p>
        <ul style={ul}>
          <li>Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this and other websites.</li>
          <li>
            Google&apos;s use of advertising cookies enables it and its partners to serve ads to you based on your visit
            to our site and/or other sites on the Internet.
          </li>
          <li>
            You may opt out of personalised advertising by visiting{" "}
            <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" style={a}>Google Ads Settings</a>.
            You can also opt out of some third-party vendors&apos; use of cookies at{" "}
            <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" style={a}>aboutads.info</a>.
          </li>
          <li>
            For more on how Google uses data when you use our partners&apos; sites or apps, see{" "}
            <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer" style={a}>Google&apos;s policy</a>.
          </li>
        </ul>
        <p>
          If you are in the EEA, UK or a region requiring consent, a consent prompt is presented for personalised ads
          where applicable.
        </p>
      </Section>

      <Section title="How we use information">
        <p>We use the limited data above to: run the games and remember your progress on your device; display and rank
          leaderboard scores; understand aggregate, anonymous traffic; and serve and measure advertising. We do{" "}
          <strong>not</strong> sell your personal data.</p>
      </Section>

      <Section title="Your choices">
        <ul style={ul}>
          <li>Clear your game data any time by clearing your browser&apos;s site data / localStorage for {SITE.domain}.</li>
          <li>Block or delete cookies in your browser settings (ads may then be non-personalised).</li>
          <li>Use the opt-out links above to limit personalised advertising.</li>
        </ul>
      </Section>

      <Section title="Children">
        <p>{SITE.name} is general-audience and not directed to children under 13 (or the minimum age in your country).
          We do not knowingly collect personal information from children.</p>
      </Section>

      <Section title="Third-party services">
        <p>We rely on: <strong>Google AdSense</strong> (advertising), <strong>Cloudflare</strong> (DNS, analytics,
          leaderboard service) and <strong>GitHub Pages</strong> (hosting). Each has its own privacy policy governing
          data it processes.</p>
      </Section>

      <Section title="Data sources">
        <p>Football statistics shown on the site are derived from publicly available league data feeds and are used for
          informational and entertainment purposes. {SITE.name} is not affiliated with any league or club.</p>
      </Section>

      <Section title="Changes">
        <p>We may update this policy; the &quot;Last updated&quot; date reflects the latest version.</p>
      </Section>

      <Section title="Contact">
        <p>Questions? See our <a href="/contact" style={a}>Contact page</a>.</p>
      </Section>
    </article>
  );
}

const ul: React.CSSProperties = { margin: ".25rem 0", paddingLeft: "1.2rem", display: "grid", gap: 8, color: "var(--muted)" };
const a: React.CSSProperties = { color: "var(--accent)" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "grid", gap: 6 }}>
      <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: ".4rem 0 0" }} dangerouslySetInnerHTML={{ __html: title }} />
      <div style={{ color: "var(--muted)" }}>{children}</div>
    </section>
  );
}
