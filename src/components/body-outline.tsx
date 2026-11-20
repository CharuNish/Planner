import { type Measure, type MeasureEntry } from "@/lib/life";
import { prettyDate } from "@/lib/dates";

// Line-art figures drawn from your measurements: "Day 1" and "Now" side by side, on the SAME scale.
// Each part (chest, waist, belly, hip, arms, thigh) is sized from its own measurement, so a slimmer
// belly or thighs shows even when the scale doesn't move.
type P = [number, number];

/** Smooth open curve through points (Catmull-Rom → Bézier). */
function curve(pts: P[]) {
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const t = 0.2;
    d += ` C${(p1[0] + (p2[0] - p0[0]) * t).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) * t).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) * t).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) * t).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** All the strokes for one figure centred at cx. */
function figure(e: MeasureEntry, k: number, cx: number) {
  // Half the front width of the body at each spot: circumference ÷ π gives the "diameter"; the factor
  // accounts for the body being wider than it is deep (more so at the hips).
  const half = (c: number, f: number) => (c / Math.PI) * f * k;
  const chest = half(e.chest, 0.5), waist = half(e.waist, 0.55), belly = half(e.belly, 0.56), hip = half(e.hip, 0.58);
  const leg = (e.thigh / Math.PI) * 0.9 * k; // front width of one thigh
  const aw = (e.arms / Math.PI) * 0.85 * k; // front width of the upper arm
  const sh = Math.max(chest * 1.12, waist + 6, 46); // shoulders barely change with weight // shoulder half width
  const R = (pts: P[]): P[] => pts.map(([x, y]) => [cx + x, y]);
  const L = (pts: P[]): P[] => pts.map(([x, y]) => [cx - x, y]);
  const g = 2;

  // Arm hangs beside the body; centre line keeps clear of the torso at every height.
  const armC: [number, number, number][] = [
    [100, sh - aw * 0.1, aw * 1.0], [140, Math.max(chest + aw / 2 + 4, sh - aw * 0.05), aw],
    [190, Math.max(waist + aw * 0.36 + 10, belly + aw * 0.36 + 6), aw * 0.7], [250, Math.max(hip + aw * 0.22 + 6, belly + aw * 0.3 + 8), aw * 0.42],
    [276, Math.max(hip + aw * 0.22 + 7, belly + aw * 0.3 + 9), aw * 0.56], [292, Math.max(hip + aw * 0.22 + 6, belly + aw * 0.3 + 8), aw * 0.2],
  ];
  const armOuter: P[] = armC.map(([y, x, w]): P => [x + w / 2, y]);
  const armInner: P[] = armC.map(([y, x, w]): P => [x - w / 2, y]).reverse();
  // Neck → shoulder → down the outside of the arm → hand → up the inside → armpit.
  const shoulderArm: P[] = [[7.5, 64], [8.5, 76], [sh * 0.62, 84], [sh, 95], ...armOuter, ...armInner.slice(1, -1), [chest * 0.98 + 1, 116]];
  // Side of the body: armpit → bust → waist → belly → hip → outer leg → foot → inner leg → crotch.
  const side: P[] = [
    [chest * 0.97, 112], [chest, 128], [(chest + waist) / 2 + 1, 150], [waist, 172], [belly, 200], [hip, 232], [Math.max(hip * 0.95, g + leg), 258],
    [g + leg * 0.97, 286], [g + leg * 0.6, 345], [g + leg * 0.63, 384], [g + leg * 0.3, 432], [g + leg * 0.44, 449], [g + leg * 0.2, 455], [g + 2, 452],
    [g + 2, 434], [g + 1, 388], [g + 2.5, 345], [g + 1, 296], [0.5, 270],
  ];
  // Bust: a soft curve under each breast, sized from how much bigger the chest is than the waist.
  const r = clamp(((e.chest - e.waist) / Math.PI) * k * 0.4 + 6, 6, 22);
  const bx = chest * 0.5;
  const breast = (s: 1 | -1) => `M${cx + s * (bx - r * 0.95)},${126 - r * 0.15} Q${cx + s * (bx - r * 0.1)},${126 + r * 1.15} ${cx + s * (bx + r * 0.95)},${124 - r * 0.1}`;
  // Tummy: a curve that grows with the belly measurement compared to the hips.
  const bulge = clamp(((e.belly - e.hip * 0.82) / Math.PI) * k * 0.5, 0, 18);
  const tummy = bulge > 2 ? `M${cx - belly * 0.72},${200} Q${cx},${206 + bulge * 1.4} ${cx + belly * 0.72},${200}` : "";
  const navel = `M${cx - 2.5},${190} Q${cx},${193} ${cx + 2.5},${190}`;
  const pelvis = `M${cx - hip * 0.38},${255} Q${cx},${270} ${cx + hip * 0.38},${255}`;
  const knee = (s: 1 | -1) => { const x = cx + s * (g + leg * 0.32); return `M${x - 4},${343} Q${x},${347} ${x + 4},${343}`; };
  // Head with a soft bob haircut.
  const head = `M${cx},${18} C${cx + 12},${18} ${cx + 16},${30} ${cx + 15},${42} C${cx + 14},${54} ${cx + 7},${62} ${cx},${62} C${cx - 7},${62} ${cx - 14},${54} ${cx - 15},${42} C${cx - 16},${30} ${cx - 12},${18} ${cx},${18}Z`;
  const hair = curve([[cx - 13, 62], [cx - 22, 56], [cx - 20, 44], [cx - 22, 28], [cx - 12, 13], [cx + 2, 10], [cx + 15, 14], [cx + 23, 28], [cx + 21, 44], [cx + 24, 56], [cx + 15, 61]]);
  const fringe = curve([[cx - 15, 34], [cx - 6, 24], [cx + 6, 21], [cx + 15, 30]]);
  return {
    main: [curve(R(shoulderArm)), curve(L(shoulderArm)), curve(R(side)), curve(L(side))],
    details: [breast(1), breast(-1), navel, pelvis, knee(1), knee(-1), tummy].filter(Boolean),
    head: [head, hair, fringe],
  };
}

function Figure({ e, k, cx, color, glow, ghost }: { e: MeasureEntry; k: number; cx: number; color: string; glow?: boolean; ghost?: MeasureEntry }) {
  const f = figure(e, k, cx);
  const g = ghost ? figure(ghost, k, cx) : null;
  return (
    <g>
      {g && <g fill="none" stroke="#c084fc" strokeOpacity="0.45" strokeWidth="1.2" strokeDasharray="4 4">{g.main.map((d, i) => <path key={i} d={d} />)}</g>}
      <g fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" filter={glow ? "url(#lineGlow)" : undefined}>
        {f.head.map((d, i) => <path key={i} d={d} strokeWidth="1.8" />)}
        {f.main.map((d, i) => <path key={i} d={d} strokeWidth="2.2" />)}
        {f.details.map((d, i) => <path key={i} d={d} strokeWidth="1.6" strokeOpacity="0.9" />)}
      </g>
    </g>
  );
}

export function BodyOutline({ entries }: { entries: MeasureEntry[] }) {
  if (!entries.length) return null;
  const first = entries[0], latest = entries[entries.length - 1];
  const both = entries.length > 1;
  // A fixed real-world scale (px per cm, figure ≈ 165 cm tall), so slim measurements really look slim.
  const k = 2.65;
  const W = both ? 440 : 230;
  const measures: Measure[] = ["chest", "waist", "belly", "hip", "arms", "thigh"];
  const changed = measures.filter((m) => latest[m] < first[m]).length;
  return (
    <div>
      <svg viewBox={`0 0 ${W} 490`} className="w-full max-w-sm mx-auto block" style={{ maxHeight: "55vh" }} role="img" aria-label={both ? "Your figure on day 1 and now, drawn from your measurements" : "Your figure, drawn from your measurements"}>
        <defs>
          <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {both && <Figure e={first} k={k} cx={112} color="#c4b5fd" />}
        <Figure e={latest} k={k} cx={both ? 328 : 115} color="#67e8f9" glow ghost={both ? first : undefined} />
        {both && <text x={112} y={482} textAnchor="middle" fontSize="13" fill="#c4b5fd" fontWeight="600">Day 1 · {prettyDate(first.date, { day: "numeric", month: "short" })}</text>}
        <text x={both ? 328 : 115} y={482} textAnchor="middle" fontSize="13" fill="#67e8f9" fontWeight="600">Now · {prettyDate(latest.date, { day: "numeric", month: "short" })}</text>
      </svg>
      {both && <p className="text-xs muted text-center mt-1">Drawn to scale from your measurements. The dashed line on “Now” is your Day 1 outline{changed ? `, so you can see the ${changed} spot${changed > 1 ? "s" : ""} that got smaller` : ""}.</p>}
    </div>
  );
}
