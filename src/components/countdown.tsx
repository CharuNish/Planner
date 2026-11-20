"use client";
import { useActionState, useEffect, useState } from "react";
import { setCountdown } from "@/app/(app)/actions";

/** Big live countdown to a date (midnight Sri Lanka time). Change it with the ✎ button. */
export function Countdown({ date, label }: { date: string; label: string }) {
  const target = new Date(`${date}T00:00:00+05:30`).getTime();
  const [now, setNow] = useState<number | null>(null);
  const [edit, setEdit] = useState(false);
  const [s, action, pending] = useActionState(setCountdown, null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const left = Math.max(0, target - (now ?? target));
  const parts = [
    { n: Math.floor(left / 86400000), u: "days" }, { n: Math.floor(left / 3600000) % 24, u: "hours" },
    { n: Math.floor(left / 60000) % 60, u: "mins" }, { n: Math.floor(left / 1000) % 60, u: "secs" },
  ];
  const done = now !== null && left === 0;
  return (
    <section className="card p-5 md:p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(500px 200px at 50% 0%, rgba(236,72,153,.22), transparent 70%)" }} />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="kicker">counting down to</div>
          <h2 className="text-2xl md:text-3xl mt-1">{label}</h2>
          <div className="text-sm muted">{new Date(`${date}T00:00:00+05:30`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Colombo" })}<button type="button" onClick={() => setEdit(!edit)} className="ml-3 text-xs underline-offset-2 hover:underline hover:text-white" aria-label="Change countdown">✎ change</button></div>
        </div>
        {done ? <div className="text-4xl" style={{ fontFamily: "var(--font-display)" }}>🎉 It&apos;s here!</div> : (
          <div className="flex gap-2 md:gap-3">
            {parts.map((p) => (
              <div key={p.u} className="rounded-2xl px-3 md:px-4 py-2 text-center min-w-[4.2rem]" data-tile="">
                <div className="text-3xl md:text-5xl font-semibold tabular gradient-text" style={{ fontFamily: "var(--font-display)" }} suppressHydrationWarning>{now === null ? "–" : String(p.n).padStart(p.u === "days" ? 1 : 2, "0")}</div>
                <div className="text-[11px] muted">{p.u}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {edit && (
        <form action={action} className="relative mt-4 flex flex-wrap gap-2 items-center">
          <input name="label" defaultValue={label} placeholder="What's happening? (e.g. Trip to Japan ✈️)" className="input flex-1 min-w-48" />
          <input name="date" type="date" defaultValue={date} className="input" required />
          <button disabled={pending} className="btn">{pending ? "Saving…" : "Save"}</button>
          {s && <span className={`text-sm ${s.error ? "text-bad" : "text-good"}`}>{s.error || s.ok}</span>}
        </form>
      )}
    </section>
  );
}
