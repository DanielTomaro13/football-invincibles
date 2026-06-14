"use client";
import { useEffect, useRef } from "react";
import { AD_CLIENT } from "@/lib/ads";

/**
 * A single responsive AdSense display unit. Renders nothing until a real slot
 * id is provided, so empty placements never shift the layout or interrupt a
 * game. Labelled "Advertisement" per AdSense policy.
 */
export default function AdUnit({
  slot,
  format = "auto",
  style,
}: {
  slot?: string;
  format?: string;
  style?: React.CSSProperties;
}) {
  const pushed = useRef(false);
  useEffect(() => {
    if (!slot || pushed.current) return;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      pushed.current = true;
    } catch {}
  }, [slot]);

  if (!slot) return null;

  return (
    <div style={{ margin: "1.5rem auto", textAlign: "center", ...style }}>
      <div style={{ fontSize: ".58rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>
        Advertisement
      </div>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
