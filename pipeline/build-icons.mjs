/**
 * Generate raster app icons from the brand mark.
 *
 * iOS Safari does NOT use SVG for apple-touch-icon or PWA home-screen icons, so
 * static PNGs are required for "Add to Home Screen" to render the brand. We emit
 * a full-bleed, fully-opaque square (iOS applies its own rounded mask, so the art
 * fills the whole tile with no transparent corners) plus standard PWA sizes and a
 * maskable variant with safe-zone padding.
 */
import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const BG = "#0a0e1a";

// Full-bleed mark (square dark tile, no rounded corners — iOS masks them itself).
const markSquare = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#00e676"/>
      <stop offset="1" stop-color="#38bdf8"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" fill="${BG}"/>
  <circle cx="32" cy="31" r="21" fill="none" stroke="url(#g)" stroke-width="3.2"/>
  <path d="M32 16l9.5 6.9-3.7 11.1H26.2L22.5 22.9z" fill="url(#g)"/>
  <text x="32" y="57.5" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="12" fill="#e8edf7">FI</text>
</svg>`;

// Maskable (PWA): art centred in the inner ~80% safe zone, dark bleed around it.
const markMaskable = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#00e676"/>
      <stop offset="1" stop-color="#38bdf8"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" fill="${BG}"/>
  <g transform="translate(32 31) scale(0.78) translate(-32 -31)">
    <circle cx="32" cy="31" r="21" fill="none" stroke="url(#g)" stroke-width="3.2"/>
    <path d="M32 16l9.5 6.9-3.7 11.1H26.2L22.5 22.9z" fill="url(#g)"/>
    <text x="32" y="57.5" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="12" fill="#e8edf7">FI</text>
  </g>
</svg>`;

const targets = [
  { file: "apple-touch-icon.png", size: 180, svg: markSquare }, // iOS home screen
  { file: "icon-192.png", size: 192, svg: markSquare },         // PWA / Android
  { file: "icon-512.png", size: 512, svg: markSquare },         // PWA splash / store
  { file: "icon-maskable-512.png", size: 512, svg: markMaskable }, // PWA maskable
  { file: "favicon-32.png", size: 32, svg: markSquare },        // tab favicon
];

for (const t of targets) {
  const png = await sharp(Buffer.from(t.svg(t.size)))
    .resize(t.size, t.size)
    .png()
    .toBuffer();
  await writeFile(join(OUT, t.file), png);
  console.log(`wrote public/${t.file} (${t.size}px)`);
}
console.log("done");
