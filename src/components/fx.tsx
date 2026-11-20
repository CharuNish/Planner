"use client";
import { useEffect, useRef, useState } from "react";

/** Number that counts up when it appears. */
export function CountUp({ value, decimals = 0, prefix = "", suffix = "", duration = 1100 }: { value: number; decimals?: number; prefix?: string; suffix?: string; duration?: number }) {
  const [v, setV] = useState(value);
  const started = useRef(false);
  useEffect(() => {
    if (started.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    started.current = true;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setV(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setV(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className="tabular">{prefix}{v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}

/** Glowing radial progress ring. value is 0..1 (can exceed 1 = over). */
export function Ring({ value, size = 120, stroke = 10, label, sub, tone = "accent", children }: {
  value: number; size?: number; stroke?: number; label?: string; sub?: string; tone?: "accent" | "good" | "warn" | "bad"; children?: React.ReactNode;
}) {
  const [p, setP] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setP(Math.max(0, Math.min(1, value)))); return () => cancelAnimationFrame(id); }, [value]);
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const id = `rg-${tone}`;
  const stops: Record<string, [string, string]> = { accent: ["#8b5cf6", "#22d3ee"], good: ["#10b981", "#22d3ee"], warn: ["#f59e0b", "#f472b6"], bad: ["#fb7185", "#f97316"] };
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${label ?? ""} ${Math.round(value * 100)}%`}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={stops[tone][0]} /><stop offset="100%" stopColor={stops[tone][1]} /></linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - p)} style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)", filter: `drop-shadow(0 0 6px ${stops[tone][0]})` }} />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">{children ?? <span className="text-xl font-semibold tabular">{Math.round(value * 100)}%</span>}</div>
      </div>
      {label && <div className="text-center"><div className="text-xs font-medium">{label}</div>{sub && <div className="text-[11px] muted">{sub}</div>}</div>}
    </div>
  );
}
