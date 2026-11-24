/* A little cursor icon for each tab, matching its background. Each is a 32×32 SVG drawn here (no emoji,
 * so it looks the same on every computer) with a soft dark outline so it shows on light and dark spots.
 * `hot` is the click point inside the icon. Phones and tablets have no cursor, so this only shows with a mouse. */

export type CursorKey = "lantern" | "coin" | "sakura" | "brush" | "jelly" | "wisteria" | "firefly" | "plane" | "star" | "heart";

const wrap = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">` +
  `<defs><filter id="s" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1" stdDeviation="0.9" flood-color="#000" flood-opacity=".55"/></filter></defs>` +
  `<g filter="url(#s)">${body}</g></svg>`;

export const CURSORS: Record<CursorKey, { svg: string; hot: [number, number] }> = {
  // Home: a glowing paper lantern
  lantern: { hot: [16, 16], svg: wrap(
    `<rect x="13" y="3" width="6" height="3" rx="1" fill="#7a3b12"/>` +
    `<ellipse cx="16" cy="15" rx="9" ry="10" fill="#ffb347" stroke="#c2410c" stroke-width="1.5"/>` +
    `<path d="M16 5v20M10 7.5c-2 5-2 10 0 15M22 7.5c2 5 2 10 0 15" stroke="#c2410c" stroke-width="1" fill="none" opacity=".7"/>` +
    `<ellipse cx="16" cy="14" rx="4" ry="5" fill="#fff3c4" opacity=".75"/>` +
    `<rect x="13" y="25" width="6" height="2.5" rx="1" fill="#7a3b12"/><path d="M16 27.5v3" stroke="#c2410c" stroke-width="1.5"/>`) },
  // Finance: a shiny gold coin
  coin: { hot: [16, 16], svg: wrap(
    `<circle cx="16" cy="16" r="12.5" fill="#f5b301" stroke="#92400e" stroke-width="1.4"/>` +
    `<circle cx="16" cy="16" r="9.5" fill="#fcd34d" stroke="#b45309" stroke-width="1"/>` +
    `<text x="16" y="19.5" text-anchor="middle" font-family="Georgia, serif" font-size="9.5" font-weight="700" fill="#92400e">Rs</text>` +
    `<path d="M9.5 11.5a8 8 0 0 1 5-4" stroke="#fff" stroke-width="1.8" stroke-linecap="round" fill="none" opacity=".85"/>` +
    `<path d="M26 5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" fill="#fff"/>`) },
  // Calendar: a cherry blossom
  sakura: { hot: [16, 16], svg: wrap(
    [0, 72, 144, 216, 288].map((a) => `<path transform="rotate(${a} 16 16)" d="M16 16c-4-4-5-9-2-12l2 2 2-2c3 3 2 8-2 12z" fill="#ffc4dc" stroke="#db2777" stroke-width="1"/>`).join("") +
    `<circle cx="16" cy="16" r="2.6" fill="#fde047" stroke="#db2777" stroke-width=".8"/>`) },
  // Studies: a calligraphy brush, the tip is the click point
  brush: { hot: [4, 28], svg: wrap(
    `<path d="M27 3l2 2-15 15-3-3z" fill="#a16207" stroke="#422006" stroke-width="1.2"/>` +
    `<path d="M11 17l3 3-2 2-3-3z" fill="#e5e7eb" stroke="#422006" stroke-width="1"/>` +
    `<path d="M9 19l3 3c-2 3-5 5-8 6 1-3 3-6 5-9z" fill="#111827" stroke="#fff" stroke-width=".8"/>`) },
  // Updates: a glowing jellyfish
  jelly: { hot: [16, 9], svg: wrap(
    `<path d="M6 13C6 6 10.5 3 16 3s10 3 10 10c-2 1.5-4 .5-5 0-1.5 1.5-3.5 1.5-5 0-1.5 1.5-3.5 1.5-5 0-1 .5-3 1.5-5 0z" fill="#c4b5fd" fill-opacity=".9" stroke="#7c3aed" stroke-width="1.2"/>` +
    `<path d="M10 14c-1 4 1 7 0 12M14 15c1 4-1 8 0 13M18 15c-1 4 1 8 0 13M22 14c1 4-1 7 0 12" stroke="#a78bfa" stroke-width="1.4" fill="none" stroke-linecap="round"/>` +
    `<ellipse cx="13" cy="8" rx="3" ry="2" fill="#fff" opacity=".7"/>`) },
  // Glow Up: a lilac butterfly from the wisteria garden
  wisteria: { hot: [16, 16], svg: wrap(
    `<path d="M15.5 15C12 7 5 3 3.5 6.5S6 15 15.5 16z" fill="#c4b5fd" stroke="#6d28d9" stroke-width="1.1"/>` +
    `<path d="M16.5 15C20 7 27 3 28.5 6.5S26 15 16.5 16z" fill="#c4b5fd" stroke="#6d28d9" stroke-width="1.1"/>` +
    `<path d="M15.5 16.5C9 17 5 21 7 24.5s7-1 8.5-7z" fill="#f0abfc" stroke="#6d28d9" stroke-width="1.1"/>` +
    `<path d="M16.5 16.5C23 17 27 21 25 24.5s-7-1-8.5-7z" fill="#f0abfc" stroke="#6d28d9" stroke-width="1.1"/>` +
    `<circle cx="8" cy="8.5" r="1.6" fill="#fff" opacity=".8"/><circle cx="24" cy="8.5" r="1.6" fill="#fff" opacity=".8"/>` +
    `<ellipse cx="16" cy="16" rx="1.3" ry="6" fill="#3b0764"/><path d="M15.5 10.5l-2-4M16.5 10.5l2-4" stroke="#3b0764" stroke-width=".9" stroke-linecap="round"/>`) },
  // Habits: a firefly with a glowing tail
  firefly: { hot: [16, 16], svg: wrap(
    `<circle cx="16" cy="20" r="7" fill="#fef08a" opacity=".45"/><circle cx="16" cy="20" r="4" fill="#facc15"/>` +
    `<ellipse cx="11" cy="10" rx="5" ry="3" fill="#e0f2fe" fill-opacity=".85" stroke="#334155" stroke-width=".8" transform="rotate(-30 11 10)"/>` +
    `<ellipse cx="21" cy="10" rx="5" ry="3" fill="#e0f2fe" fill-opacity=".85" stroke="#334155" stroke-width=".8" transform="rotate(30 21 10)"/>` +
    `<ellipse cx="16" cy="13" rx="2.6" ry="4.5" fill="#1f2937"/>`) },
  // Milestones: a paper plane, its nose is the click point
  plane: { hot: [3, 3], svg: wrap(
    `<path d="M3 3l26 9-11 3-3 11z" fill="#fff" stroke="#334155" stroke-width="1.3" stroke-linejoin="round"/>` +
    `<path d="M3 3l15 12" stroke="#94a3b8" stroke-width="1.2"/><path d="M18 15l-3 11 0-8z" fill="#cbd5e1"/>`) },
  // Wins: a golden star
  star: { hot: [16, 16], svg: wrap(
    `<path d="M16 2.5l3.9 8.3 9 1-6.7 6.2 1.9 8.9L16 22.3l-8.1 4.6 1.9-8.9L3.1 11.8l9-1z" fill="#fde047" stroke="#b45309" stroke-width="1.3" stroke-linejoin="round"/>` +
    `<path d="M12 12l2-3" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>`) },
  // Content: a pink heart
  heart: { hot: [16, 16], svg: wrap(
    `<path d="M16 28S3.5 20 3.5 11.5A6.5 6.5 0 0 1 16 8.4a6.5 6.5 0 0 1 12.5 3.1C28.5 20 16 28 16 28z" fill="#f472b6" stroke="#be185d" stroke-width="1.4"/>` +
    `<path d="M8.5 10.5a3 3 0 0 1 3-2.5" stroke="#fff" stroke-width="1.6" stroke-linecap="round" fill="none" opacity=".85"/>`) },
};

/** CSS cursor value for one icon, falling back to the normal arrow or hand. */
export const cursorCss = (k: CursorKey, fallback: "auto" | "pointer") => {
  const c = CURSORS[k];
  return `url("data:image/svg+xml,${encodeURIComponent(c.svg)}") ${c.hot[0]} ${c.hot[1]}, ${fallback}`;
};
