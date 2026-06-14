/**
 * Tiny Web Audio sound effects — no asset files. Sounds only fire after a user
 * gesture (the spin button), which satisfies browser autoplay rules. A mute
 * preference is stored in localStorage.
 */
let ctx: AudioContext | null = null;
const KEY = "fi.sound";

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function isMuted(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(KEY) === "off";
}
export function setMuted(m: boolean) {
  try {
    localStorage.setItem(KEY, m ? "off" : "on");
  } catch {}
}

function blip(freq: number, start: number, dur: number, type: OscillatorType = "square", gain = 0.06) {
  const c = ac();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  g.gain.setValueAtTime(gain, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  osc.connect(g).connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + dur);
}

/** Slot-machine spin: a ratchet of ticks that slows down over `durationMs`. */
export function playSpin(durationMs = 700) {
  if (isMuted()) return;
  const c = ac();
  if (!c) return;
  let t = 0;
  let gap = 0.028;
  while (t < durationMs / 1000) {
    blip(420 + Math.random() * 80, t, 0.025, "square", 0.045);
    t += gap;
    gap *= 1.12; // decelerate
  }
}

/** A satisfying "locked in" tone when a spin settles or a player is picked. */
export function playSelect() {
  if (isMuted()) return;
  blip(660, 0, 0.09, "triangle", 0.07);
  blip(990, 0.07, 0.12, "triangle", 0.06);
}

/** Celebratory arpeggio for an unbeaten season. */
export function playWin() {
  if (isMuted()) return;
  [523, 659, 784, 1047].forEach((f, i) => blip(f, i * 0.12, 0.22, "triangle", 0.07));
}
