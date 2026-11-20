"use client";
import { useEffect, useState } from "react";

/** Live countdown to a paper deadline (end of day, Anywhere on Earth). */
export function DeadlineCountdown({ deadline, label, estimated }: { deadline: string; label: string; estimated?: boolean }) {
  const target = new Date(`${deadline}T23:59:59-12:00`).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const left = Math.max(0, target - (now ?? target));
  const parts = [
    { n: Math.floor(left / 86400000), u: "days" }, { n: Math.floor(left / 3600000) % 24, u: "hrs" },
    { n: Math.floor(left / 60000) % 60, u: "min" }, { n: Math.floor(left / 1000) % 60, u: "sec" },
  ];
  return (
    <div className="rounded-2xl p-3 md:p-4 text-right" data-tile="">
      <div className="text-[11px] muted uppercase tracking-wide">next deadline · {label}{estimated ? " (est.)" : ""}</div>
      <div className="flex gap-2 justify-end mt-1">
        {parts.map((p) => (
          <div key={p.u} className="text-center min-w-[3rem]">
            <div className="text-2xl md:text-3xl font-semibold tabular gradient-text" style={{ fontFamily: "var(--font-display)" }} suppressHydrationWarning>{now === null ? "–" : String(p.n).padStart(p.u === "days" ? 1 : 2, "0")}</div>
            <div className="text-[10px] muted">{p.u}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
