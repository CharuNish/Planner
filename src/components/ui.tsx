import React from "react";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <div className="kicker mb-1">{"// "}{title.replace(/^[^\w]+/, "").split(" ")[0].toLowerCase()}</div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="muted text-sm mt-1 max-w-3xl">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: "good" | "warn" | "bad" }) {
  const color = tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : tone === "bad" ? "text-bad" : "";
  return (
    <div className="card p-4 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-40" style={{ background: tone === "bad" ? "#fb7185" : tone === "warn" ? "#fbbf24" : tone === "good" ? "#34d399" : "#8b5cf6" }} />
      <div className="kicker">{label}</div>
      <div className={`text-2xl font-semibold mt-1.5 tabular ${color}`} style={{ fontFamily: "var(--font-display)" }}>{value}</div>
      {hint && <div className="text-xs muted mt-1">{hint}</div>}
    </div>
  );
}

export function Section({ title, action, children, className = "" }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DemoBanner({ what }: { what: string }) {
  return (
    <div className="mb-5 rounded-xl px-4 py-3 text-sm soft">
      👀 You're seeing <b>sample data</b>. Connect your {what} to see your real numbers (steps in SETUP.md).
    </div>
  );
}

export function ProgressBar({ value, tone = "accent" }: { value: number; tone?: "accent" | "good" | "warn" | "bad" }) {
  const v = Math.max(0, Math.min(1, value));
  const bg = tone === "accent" ? "linear-gradient(90deg,#8b5cf6,#22d3ee)" : tone === "good" ? "linear-gradient(90deg,#10b981,#34d399)" : tone === "warn" ? "linear-gradient(90deg,#f59e0b,#fbbf24)" : "linear-gradient(90deg,#f43f5e,#fb7185)";
  const glow = tone === "accent" ? "#8b5cf6" : `var(--${tone})`;
  return <div className="bar"><span style={{ width: `${v * 100}%`, background: bg, color: glow, transition: "width 1s cubic-bezier(.2,.8,.2,1)" }} /></div>;
}

export function StatusChip({ status }: { status: string }) {
  const tone = status === "On track" || status === "Done" ? "var(--good)" : status === "Tight" ? "var(--warn)" : "var(--bad)";
  return <span className="chip" style={{ color: tone, background: `color-mix(in srgb, ${tone} 14%, transparent)`, borderColor: `color-mix(in srgb, ${tone} 35%, transparent)`, boxShadow: `0 0 12px color-mix(in srgb, ${tone} 30%, transparent)` }}>● {status}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm muted">{children}</p>;
}
