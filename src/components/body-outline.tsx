import { MEASURE_LABEL, type Measure, type MeasureEntry } from "@/lib/life";
import { prettyDate } from "@/lib/dates";

// A front-view line figure drawn from your measurements (all outlines use the same scale,
// so as you slim down the newest outline sits inside the first one).
const CX = 150;
type P = [number, number];

function smoothClosed(pts: P[]) {
  const n = pts.length; let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const t = 0.18;
    d += ` C${(p1[0] + (p2[0] - p0[0]) * t).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) * t).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) * t).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) * t).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + "Z";
}
const mirror = (pts: P[]): P[] => pts.map(([x, y]) => [CX - x, y]);
const right = (pts: P[]): P[] => pts.map(([x, y]) => [CX + x, y]);

// Measurement heights on the figure.
const Y: Record<Measure, number> = { chest: 128, waist: 172, belly: 200, hip: 232, arms: 140, thigh: 285 };

const LABEL_Y: Record<Measure, number> = { chest: 104, arms: 140, waist: 176, belly: 212, hip: 248, thigh: 292 };

function shape(e: MeasureEntry, k: number) {
  const half = (c: number) => (c / Math.PI) * 0.625 * k; // half the front width of a body part
  const chest = half(e.chest), waist = half(e.waist), belly = half(e.belly), hip = half(e.hip);
  const leg = (e.thigh / Math.PI) * 0.95 * k; // front width of one thigh
  const aw = (e.arms / Math.PI) * 0.9 * k; // front width of the upper arm
  const shoulder = Math.max(chest * 1.1, 40);
  const g = 2.5;
  const side: P[] = [
    [10, 60], [13, 76], [shoulder * 0.8, 84], [shoulder, 94], [chest * 0.97, 110], [chest, Y.chest], [(chest + waist) / 2 + 1, 150],
    [waist, Y.waist], [belly, Y.belly], [hip, Y.hip], [Math.max(hip * 0.96, g + leg), 258], [g + leg * 0.98, Y.thigh], [g + leg * 0.62, 345],
    [g + leg * 0.64, 384], [g + leg * 0.32, 432], [g + leg * 0.46, 450], [g + 3, 455], [g + 2, 434], [g + 1, 388], [g + 2, 345], [g + 1, 300], [0.5, 268],
  ];
  const torso = smoothClosed([...right(side), ...mirror(side).reverse()]);
  // Arm: centre line + width at each height, hanging beside the body.
  const c: [number, number, number][] = [
    [96, shoulder - aw * 0.15, aw * 1.05], [Y.arms, Math.max(chest + aw / 2 + 3, shoulder - aw * 0.05), aw], [188, Math.max(waist + aw * 0.36 + 9, belly + aw * 0.2 + 4), aw * 0.72],
    [255, Math.max(hip + aw * 0.22 + 6, belly + aw * 0.3 + 8), aw * 0.42], [282, Math.max(hip + aw * 0.22 + 7, belly + aw * 0.3 + 9), aw * 0.6], [298, Math.max(hip + aw * 0.22 + 7, belly + aw * 0.3 + 9), aw * 0.15],
  ];
  const outer: P[] = c.map(([y, x, w]): P => [x + w / 2, y]);
  const inner: P[] = c.map(([y, x, w]): P => [x - w / 2, y]).reverse();
  const arm: P[] = [[shoulder - 2, 89], ...outer, ...inner.slice(1)];
  const arms = [smoothClosed(right(arm)), smoothClosed(mirror(arm))];
  const edge: Record<Measure, number> = { chest, waist, belly, hip, arms: c[1][1] + aw / 2, thigh: g + leg };
  return { torso, arms, edge };
}

export function BodyOutline({ entries }: { entries: MeasureEntry[] }) {
  if (!entries.length) return null;
  const first = entries[0], latest = entries[entries.length - 1];
  // Same scale for every outline, fitted to the biggest hip measurement.
  const maxHip = Math.max(...entries.map((e) => e.hip || 100));
  const k = 64 / ((maxHip / Math.PI) * 0.625);
  const shapes = entries.map((e) => shape(e, k));
  const now = shapes[shapes.length - 1], start = shapes[0];
  const middle = shapes.slice(1, -1);
  const measures: Measure[] = ["chest", "arms", "waist", "belly", "hip", "thigh"];
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return (
    <div>
      <svg viewBox="0 0 470 470" className="w-full max-w-xl mx-auto block" role="img" aria-label="Body outline: your first measurements dashed, latest solid">
        <defs>
          <linearGradient id="bodyFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity="0.16" /><stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.06" /></linearGradient>
          <filter id="bodyGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <circle cx={CX} cy={36} r={20} fill="none" stroke="#22d3ee" strokeOpacity="0.8" strokeWidth="1.6" />
        {entries.length > 1 && (
          <g fill="none" stroke="#c084fc" strokeWidth="1.4" strokeDasharray="5 4" strokeOpacity="0.75">
            <path d={start.torso} />{start.arms.map((d, i) => <path key={i} d={d} />)}
          </g>
        )}
        {middle.map((s, i) => <g key={i} fill="none" stroke="#a78bfa" strokeOpacity="0.22" strokeWidth="1"><path d={s.torso} />{s.arms.map((d, j) => <path key={j} d={d} />)}</g>)}
        <g fill="url(#bodyFill)" stroke="#22d3ee" strokeWidth="2" filter="url(#bodyGlow)">
          {now.arms.map((d, i) => <path key={i} d={d} />)}<path d={now.torso} />
        </g>
        {measures.map((m) => {
          const y = Y[m];
          const ly = LABEL_Y[m];
          const x0 = CX + Math.max(now.edge[m], start.edge[m]) + 6;
          const ch = r1(latest[m] - first[m]);
          return (
            <g key={m}>
              <polyline points={`${x0},${y} ${x0 + 12},${y} 296,${ly}`} fill="none" stroke="var(--muted)" strokeOpacity="0.4" strokeDasharray="2 3" />
              <text x={306} y={ly - 2} fontSize="12" fill="var(--fg)" fontWeight="600">{MEASURE_LABEL[m]} {r1(latest[m])} cm</text>
              {entries.length > 1 && <text x={306} y={ly + 12} fontSize="11" fill={ch < 0 ? "#34d399" : ch > 0 ? "#fbbf24" : "var(--muted)"}>{ch < 0 ? `▼ ${-ch} cm` : ch > 0 ? `▲ ${ch} cm` : "no change"} since day 1</text>}
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap justify-center gap-4 text-xs muted mt-1">
        {entries.length > 1 && <span className="flex items-center gap-1.5"><svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="#c084fc" strokeWidth="1.6" strokeDasharray="5 4" /></svg>Day 1 ({prettyDate(first.date, { day: "numeric", month: "short", year: "numeric" })})</span>}
        {entries.length > 2 && <span className="flex items-center gap-1.5"><svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="#a78bfa" strokeOpacity="0.4" /></svg>In between</span>}
        <span className="flex items-center gap-1.5"><svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="#22d3ee" strokeWidth="2" /></svg>Now ({prettyDate(latest.date, { day: "numeric", month: "short", year: "numeric" })})</span>
      </div>
    </div>
  );
}
