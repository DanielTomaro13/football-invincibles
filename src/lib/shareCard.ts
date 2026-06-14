/**
 * Renders a square (1080×1080) share image of the user's team + result on a
 * canvas, returned as a PNG Blob. No external images (keeps the canvas
 * CORS-clean), so it works everywhere navigator.share / downloads do.
 */
export interface ShareLine {
  label: string;
  players: { name: string; rating: number }[];
}

export async function generateShareCard(opts: {
  title: string;
  record: string;
  rating: number;
  mode: string;
  lines: ShareLine[];
  gold: boolean;
}): Promise<Blob | null> {
  const W = 1080, H = 1080;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) return null;

  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#0a0e1a");
  g.addColorStop(1, "#0a3322");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#00e676";
  ctx.fillRect(0, 0, W, 14);
  ctx.fillRect(0, H - 14, W, 14);

  ctx.textAlign = "center";
  ctx.fillStyle = "#93a0bd";
  ctx.font = "700 30px Arial, sans-serif";
  ctx.fillText("⚽  FOOTBALL INVINCIBLES", W / 2, 78);

  ctx.fillStyle = opts.gold ? "#ffd166" : "#e8edf7";
  ctx.font = "900 76px Arial, sans-serif";
  ctx.fillText(opts.title, W / 2, 162);

  ctx.fillStyle = "#e8edf7";
  ctx.font = "800 50px Arial, sans-serif";
  ctx.fillText(opts.record, W / 2, 228);
  ctx.fillStyle = "#00e676";
  ctx.font = "700 32px Arial, sans-serif";
  ctx.fillText(`${opts.rating.toFixed(1)} rated · ${opts.mode}`, W / 2, 274);

  let y = 340;
  for (const line of opts.lines) {
    ctx.fillStyle = "#5f6b86";
    ctx.font = "700 22px Arial, sans-serif";
    ctx.fillText(line.label.toUpperCase(), W / 2, y);
    y += 34;
    ctx.font = "600 27px Arial, sans-serif";
    // up to 3 players per row, centred
    for (let i = 0; i < line.players.length; i += 3) {
      const chunk = line.players.slice(i, i + 3);
      const text = chunk.map((p) => `${p.name} ${p.rating}`).join("    ·    ");
      ctx.fillStyle = "#e8edf7";
      ctx.fillText(text, W / 2, y);
      y += 36;
    }
    y += 12;
  }

  ctx.fillStyle = "#00e676";
  ctx.font = "800 34px Arial, sans-serif";
  ctx.fillText("footballinvincibles.com", W / 2, H - 46);

  return new Promise((res) => c.toBlob((b) => res(b), "image/png"));
}
