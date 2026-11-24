/* Building blocks for the code-drawn Swiss scenes (src/components/swiss/scenes.tsx).
 * Everything is plain SVG, so it costs nothing, needs no downloads and stays light on phones.
 * Shapes come from a seeded random generator, so the server and the browser draw the same picture. */
import type { CSSProperties, ReactNode } from "react";

export const W = 1600, H = 1000;

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A peak: centre x, height, half-width, and skew s (-0.6..0.6; positive = steeper on the right). */
export type Peak = { x: number; h: number; w: number; s?: number };

/** Heights along a mountain ridge: jagged midpoint-displacement noise plus sharp triangular peaks. */
export function ridge(seed: number, base: number, amp: number, peaks: Peak[] = [], rough = 0.55, step = 12) {
  const r = rng(seed);
  const n = 128;
  const md = new Array(n + 1).fill(0);
  md[0] = r(); md[n] = r();
  for (let size = n, scale = 1; size > 1; size /= 2, scale *= rough) {
    for (let i = size / 2; i < n; i += size) md[i] = (md[i - size / 2] + md[i + size / 2]) / 2 + (r() - 0.5) * scale;
  }
  // second, rougher noise for craggy peak edges
  const cr = new Array(n + 1).fill(0);
  cr[0] = r(); cr[n] = r();
  for (let size = n, scale = 1; size > 1; size /= 2, scale *= 0.7) {
    for (let i = size / 2; i < n; i += size) cr[i] = (cr[i - size / 2] + cr[i + size / 2]) / 2 + (r() - 0.5) * scale;
  }
  const pts: [number, number][] = [];
  for (let x = -60; x <= W + 60; x += step) {
    const f = ((x + 60) / (W + 120)) * n, i = Math.min(n - 1, Math.floor(f)), t = f - i;
    let h = (md[i] * (1 - t) + md[i + 1] * t) * amp;
    const c = cr[i] * (1 - t) + cr[i + 1] * t;
    for (const p of peaks) {
      const sk = p.s ?? 0;
      const d = x < p.x ? (p.x - x) / (p.w * (1 + sk)) : (x - p.x) / (p.w * (1 - sk));
      if (d < 1) h = Math.max(h, p.h * (1 - d) ** 1.25 * (1 + (c - 0.5) * 0.5 * Math.min(1, d * 2.5)));
    }
    pts.push([x, base - h]);
  }
  return pts;
}

export const toPath = (pts: [number, number][], bottom = H + 20) =>
  `M${pts[0][0]},${bottom} ` + pts.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(" ") + ` L${pts[pts.length - 1][0]},${bottom} Z`;

let uid = 0;
const id = (p: string) => `${p}${++uid}`;

/** A mountain layer: body fades into haze at the bottom, soft snow cap, shaded east faces on main peaks. */
export function Range({ pts, peaks = [], fill, haze, snow, snowLine, shade = 0.22, top }: {
  pts: [number, number][]; peaks?: Peak[]; fill: string; haze?: string; snow?: string; snowLine?: number; shade?: number; top?: number;
}) {
  const d = toPath(pts);
  const clip = id("rc"), grad = id("sg"), body = id("bd");
  const minY = top ?? Math.min(...pts.map((p) => p[1]));
  const maxY = Math.max(...pts.map((p) => p[1]));
  return (
    <g>
      <defs>
        <clipPath id={clip}><path d={d} /></clipPath>
        <linearGradient id={body} gradientUnits="userSpaceOnUse" x1="0" y1={minY} x2="0" y2={maxY + 60}>
          <stop offset="0" stopColor={fill} /><stop offset="1" stopColor={haze ?? fill} />
        </linearGradient>
        {snow && (
          <linearGradient id={grad} gradientUnits="userSpaceOnUse" x1="0" y1={minY} x2="0" y2={snowLine ?? minY + 160}>
            <stop offset="0" stopColor={snow} stopOpacity="0.95" />
            <stop offset="0.7" stopColor={snow} stopOpacity="0.5" />
            <stop offset="1" stopColor={snow} stopOpacity="0" />
          </linearGradient>
        )}
        {peaks.map((p, i) => (
          <linearGradient key={i} id={`${body}s${i}`} gradientUnits="userSpaceOnUse" x1="0" y1={maxY - p.h} x2="0" y2={maxY + 40}>
            <stop offset="0" stopColor="#000" stopOpacity={shade} /><stop offset=".75" stopColor="#000" stopOpacity={shade * 0.5} /><stop offset="1" stopColor="#000" stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      <path d={d} fill={`url(#${body})`} />
      <g clipPath={`url(#${clip})`}>
        {snow && <path d={d} fill={`url(#${grad})`} />}
        {peaks.map((p, i) => {
          const wr = p.w * (1 - (p.s ?? 0));
          const apex = pts.reduce((m, q) => (Math.abs(q[0] - p.x) < 40 && q[1] < m[1] ? q : m), [p.x, 99999] as [number, number]);
          return <path key={i} d={`M${apex[0]},${apex[1] - 4} L${apex[0] + wr * 1.1},${maxY + 80} L${apex[0] + wr * 0.08},${maxY + 80} Z`} fill={`url(#${body}s${i})`} />;
        })}
      </g>
    </g>
  );
}

/** Wraps a group of layers so it slides a little when the cursor moves (depth 0 = still, 1 = most). */
export function Depth({ d, children, style }: { d: number; children: ReactNode; style?: CSSProperties }) {
  return (
    <g className="sw-depth" style={{ ["--d" as string]: d, ...style } as CSSProperties}>
      {children}
    </g>
  );
}

export function Sky({ stops }: { stops: string[] }) {
  const g = id("sky");
  return (
    <>
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
          {stops.map((c, i) => <stop key={i} offset={i / (stops.length - 1)} stopColor={c} />)}
        </linearGradient>
      </defs>
      <rect x={-200} y={-200} width={W + 400} height={H + 400} fill={`url(#${g})`} />
    </>
  );
}

export function Stars({ n = 120, seed = 7, maxY = 520, color = "#fff" }: { n?: number; seed?: number; maxY?: number; color?: string }) {
  const r = rng(seed);
  return (
    <g fill={color}>
      {Array.from({ length: n }, (_, i) => {
        const x = r() * W, y = r() * maxY, s = r() < 0.08 ? 1.9 : 0.5 + r() * 1.1;
        const tw = i % 5 === 0;
        return <circle key={i} cx={x} cy={y} r={s} opacity={0.35 + r() * 0.6} className={tw ? "sw-twinkle" : undefined}
          style={tw ? { animationDelay: `${(r() * 6).toFixed(2)}s`, animationDuration: `${(2.5 + r() * 3).toFixed(2)}s` } : undefined} />;
      })}
    </g>
  );
}

export function Glow({ cx, cy, r, color, opacity = 1 }: { cx: number; cy: number; r: number; color: string; opacity?: number }) {
  const g = id("gl");
  return (
    <>
      <defs>
        <radialGradient id={g}>
          <stop offset="0" stopColor={color} stopOpacity={opacity} />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={`url(#${g})`} />
    </>
  );
}

/** Soft cloud made of overlapping ellipses. Drifts sideways on a loop. */
export function Cloud({ x, y, s = 1, color = "#fff", opacity = 0.5, dur = 90, delay = 0 }: { x: number; y: number; s?: number; color?: string; opacity?: number; dur?: number; delay?: number }) {
  return (
    <g className="sw-drift" style={{ animationDuration: `${dur}s`, animationDelay: `${-delay}s` }}>
      <g transform={`translate(${x},${y}) scale(${s})`} fill={color} opacity={opacity}>
        <ellipse cx="0" cy="0" rx="120" ry="26" />
        <ellipse cx="-40" cy="-16" rx="60" ry="26" />
        <ellipse cx="30" cy="-24" rx="70" ry="32" />
        <ellipse cx="90" cy="-6" rx="50" ry="20" />
      </g>
    </g>
  );
}

export function Pines({ seed, y0, y1, x0 = -40, x1 = W + 40, n = 60, color, size = 1, onRidge }: {
  seed: number; y0: number; y1?: number; x0?: number; x1?: number; n?: number; color: string; size?: number; onRidge?: (x: number) => number;
}) {
  const r = rng(seed);
  const trees = Array.from({ length: n }, () => {
    const x = x0 + r() * (x1 - x0);
    const y = onRidge ? onRidge(x) + r() * 14 : y0 + r() * ((y1 ?? y0) - y0);
    const h = (34 + r() * 30) * size;
    return { x, y, h };
  }).sort((a, b) => a.y - b.y);
  return (
    <g fill={color}>
      {trees.map((t, i) => (
        <path key={i} d={`M${t.x},${t.y - t.h} L${t.x + t.h * 0.22},${t.y - t.h * 0.55} L${t.x + t.h * 0.12},${t.y - t.h * 0.55} L${t.x + t.h * 0.32},${t.y - t.h * 0.12} L${t.x + t.h * 0.04},${t.y - t.h * 0.12} L${t.x + t.h * 0.04},${t.y} L${t.x - t.h * 0.04},${t.y} L${t.x - t.h * 0.04},${t.y - t.h * 0.12} L${t.x - t.h * 0.32},${t.y - t.h * 0.12} L${t.x - t.h * 0.12},${t.y - t.h * 0.55} L${t.x - t.h * 0.22},${t.y - t.h * 0.55} Z`} />
      ))}
    </g>
  );
}

/** Height of a ridge at x (for placing trees and houses on it). */
export const at = (pts: [number, number][], x: number) => {
  for (let i = 1; i < pts.length; i++) if (pts[i][0] >= x) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], t = (x - x0) / (x1 - x0);
    return y0 + (y1 - y0) * t;
  }
  return pts[pts.length - 1][1];
};

/** Swiss chalet: wide low roof, balcony, glowing windows. */
export function Chalet({ x, y, s = 1, wall = "#6b4630", roof = "#2b1d18", snow, lit = "#ffcf7a", seed = 1 }: {
  x: number; y: number; s?: number; wall?: string; roof?: string; snow?: string; lit?: string; seed?: number;
}) {
  const r = rng(seed);
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <rect x={-34} y={-40} width={68} height={40} fill={wall} />
      <rect x={-34} y={-40} width={68} height={6} fill="#000" opacity=".2" />
      <path d="M-50,-36 L0,-72 L50,-36 L44,-34 L0,-64 L-44,-34 Z" fill={roof} />
      <path d="M-44,-34 L0,-64 L44,-34 L34,-34 L0,-58 L-34,-34 Z" fill={wall} />
      {snow && <path d="M-52,-37 L0,-75 L52,-37 L44,-36 L0,-68 L-44,-36 Z" fill={snow} />}
      <rect x={-36} y={-20} width={72} height={3} fill={roof} />
      {[-22, -4, 14].map((wx, i) => (
        <rect key={i} x={wx} y={-33} width={9} height={10} rx={1} fill={lit} className={r() < 0.5 ? "sw-flicker" : undefined}
          style={{ animationDelay: `${(r() * 5).toFixed(2)}s` }} />
      ))}
      <rect x={-6} y={-48} width={12} height={9} rx={1} fill={lit} opacity=".85" />
      <rect x={-20} y={-14} width={9} height={10} rx={1} fill={lit} opacity=".9" />
      <rect x={10} y={-14} width={9} height={10} rx={1} fill={lit} opacity=".7" />
    </g>
  );
}

/** Mirror a group in still water, faded, with gently moving light streaks. */
export function Reflect({ y, children, opacity = 0.35, blur = 2 }: { y: number; children: ReactNode; opacity?: number; blur?: number }) {
  const f = id("rf");
  return (
    <g opacity={opacity}>
      <defs><filter id={f}><feGaussianBlur stdDeviation={`${blur * 2} ${blur}`} /></filter></defs>
      <g transform={`translate(0,${2 * y}) scale(1,-1)`} filter={`url(#${f})`}>{children}</g>
    </g>
  );
}

export function Shimmer({ seed, y0, y1, n = 40, color = "#fff", x0 = 0, x1 = W }: { seed: number; y0: number; y1: number; n?: number; color?: string; x0?: number; x1?: number }) {
  const r = rng(seed);
  return (
    <g stroke={color} strokeLinecap="round">
      {Array.from({ length: n }, (_, i) => {
        const y = y0 + r() * (y1 - y0), x = x0 + r() * (x1 - x0), w = 10 + r() * 50 * ((y - y0) / (y1 - y0) + 0.3);
        return <line key={i} x1={x} x2={x + w} y1={y} y2={y} strokeWidth={1 + r() * 1.5} className="sw-shimmer"
          style={{ animationDelay: `${(r() * 4).toFixed(2)}s`, animationDuration: `${(2.5 + r() * 3).toFixed(2)}s` }} />;
      })}
    </g>
  );
}

export function Birds({ x, y, n = 4, color = "#1b1f33", dur = 40 }: { x: number; y: number; n?: number; color?: string; dur?: number }) {
  return (
    <g className="sw-birds" style={{ animationDuration: `${dur}s` }}>
      {Array.from({ length: n }, (_, i) => (
        <path key={i} className="sw-flap" style={{ animationDelay: `${i * 0.23}s` }} transform={`translate(${x + i * 28 - (i % 2) * 10},${y + (i % 3) * 14})`}
          d="M-9,0 Q-4,-6 0,0 Q4,-6 9,0" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      ))}
    </g>
  );
}

/** Cheap falling snow: two tiled layers of dots that slide down (no per-flake work for the phone). */
export function Snowfall({ strength = 1 }: { strength?: number }) {
  return <div className="sw-snow" style={{ opacity: strength }} aria-hidden />;
}
