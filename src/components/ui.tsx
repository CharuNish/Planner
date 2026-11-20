import React from "react";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="muted text-sm mt-1">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: "good" | "warn" | "bad" }) {
  const color = tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : tone === "bad" ? "text-bad" : "";
  return (
    <div className="card p-4">
      <div className="text-xs muted font-medium">{label}</div>
      <div className={`text-2xl font-semibold mt-1 tabular ${color}`}>{value}</div>
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
  return <div className="bar"><span style={{ width: `${v * 100}%`, background: `var(--${tone === "accent" ? "accent" : tone})` }} /></div>;
}

export function StatusChip({ status }: { status: string }) {
  const tone = status === "On track" || status === "Done" ? "var(--good)" : status === "Tight" ? "var(--warn)" : "var(--bad)";
  return <span className="chip" style={{ color: tone, background: `color-mix(in srgb, ${tone} 14%, transparent)` }}>{status}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm muted">{children}</p>;
}
