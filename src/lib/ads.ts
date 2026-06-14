/**
 * Google AdSense configuration.
 *
 * The loader script (in the root layout) enables **Auto Ads** as soon as Auto
 * Ads is switched on in the AdSense dashboard — no slot IDs required.
 *
 * For the controlled, non-intrusive manual placements (bottom-of-page banner
 * and a unit below each game), create display ad units in AdSense and paste
 * their slot IDs below. While a slot is empty the placement renders nothing,
 * so gameplay is never pushed around by an empty box.
 */
export const AD_CLIENT = "ca-pub-2087141992057731";

export const AD_SLOTS = {
  /** "Home" unit — responsive banner shown at the bottom of every page */
  inline: "5789788385",
  /** "Result" unit — shown below the interactive game (after gameplay, never inside it) */
  game: "6838809461",
};
