/**
 * Cross-site strip linking the three sister projects (the "0 Series"), plus a
 * contextual cross-promo line. The same bar lives at the top of AFL 23-0 and
 * NRL 24-0 so all three sites point at one another. Self-contained inline styles.
 */
const SITES = [
  { key: "afl", label: "AFL 23-0", href: "https://afl23-0.com" },
  { key: "nrl", label: "NRL 24-0", href: "https://nrl24-0.com" },
  { key: "football", label: "Football Invincibles", href: "https://footballinvincibles.com" },
];

const PROMO: Record<string, { emoji: string; text: string; label: string; href: string }> = {
  football: { emoji: "🏉", text: "Into footy or league? Try →", label: "AFL 23-0 · NRL 24-0", href: "https://nrl24-0.com" },
  nrl: { emoji: "⚽", text: "Into soccer? Try the Football version →", label: "Football Invincibles", href: "https://footballinvincibles.com" },
  afl: { emoji: "🏉", text: "Into rugby league? Try →", label: "NRL 24-0", href: "https://nrl24-0.com" },
};

export default function SisterSites({ active }: { active: "afl" | "nrl" | "football" }) {
  const promo = PROMO[active];
  return (
    <div style={{ background: "#06080f", borderBottom: "1px solid var(--border,#26314d)", paddingTop: "env(safe-area-inset-top)" }}>
      <div
        role="navigation"
        aria-label="Sister sites"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: ".74rem", padding: "5px 0.6rem 3px", overflowX: "auto" }}
      >
        <span style={{ color: "var(--muted,#93a0bd)", marginRight: 2, fontWeight: 700, fontSize: ".7rem" }}>THE 0 SERIES ·</span>
        {SITES.map((s) =>
          s.key === active ? (
            <span key={s.key} aria-current="page" style={{ whiteSpace: "nowrap", padding: "3px 9px", borderRadius: 999, color: "var(--text,#e8edf7)", background: "var(--panel-2,#1d2740)", border: "1px solid var(--border,#26314d)", fontWeight: 600 }}>{s.label}</span>
          ) : (
            <a key={s.key} href={s.href} style={{ whiteSpace: "nowrap", padding: "3px 9px", borderRadius: 999, color: "var(--muted,#93a0bd)", fontWeight: 600 }}>{s.label}</a>
          )
        )}
      </div>
      {promo && (
        <div style={{ textAlign: "center", fontSize: ".74rem", padding: "0 0.6rem 5px", color: "var(--muted,#93a0bd)" }}>
          <span style={{ marginRight: 6 }}>{promo.emoji}</span>
          {promo.text}{" "}
          <a href={promo.href} style={{ color: "var(--accent,#00e676)", fontWeight: 700 }}>{promo.label}</a>
        </div>
      )}
    </div>
  );
}
