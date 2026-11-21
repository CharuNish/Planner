"use client";
import { useActionState, useState, useTransition } from "react";
import { saveBotTimes, sendBotNow } from "@/app/(app)/actions";

type T = { key: string; label: string; hint: string; time: string; on: boolean };
type L = { slot: string; time: string; status: string };

/** Home page card: pick when the Telegram bot texts you, see what it sent today, send a test. */
export function BotTimes({ times, log }: { times: T[]; log: L[] }) {
  const [s, action, pending] = useActionState(saveBotTimes, null);
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [testing, start] = useTransition();
  const [which, setWhich] = useState("");
  const sent = (k: string) => log.filter((l) => l.slot === k).at(-1);
  return (
    <section className="card p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="kicker">telegram</div>
          <h2 className="text-xl mt-1">🤖 Bestie bot schedule</h2>
        </div>
        <p className="text-xs muted max-w-sm">Pick when I text you. Sri Lanka time. Untick one to mute it.</p>
      </div>
      <form action={action} className="mt-4 space-y-2">
        {times.map((t) => {
          const l = sent(t.key);
          return (
            <div key={t.key} className="flex flex-wrap items-center gap-3 rounded-2xl px-3 py-2" data-tile="">
              <label className="flex items-center gap-2 min-w-[13rem] flex-1 cursor-pointer">
                <input type="checkbox" name={`${t.key}-on`} defaultChecked={t.on} className="w-4 h-4 accent-pink-400" />
                <span>
                  <span className="font-semibold">{t.label}</span>
                  <span className="block text-xs muted">{t.hint}</span>
                </span>
              </label>
              <input type="time" name={`${t.key}-time`} defaultValue={t.time} step={300} required className="input w-32" />
              <span className="text-xs muted w-36 tabular">{l ? (l.status === "sent" ? `✓ sent today ${l.time}` : `· ${l.status}`) : "not yet today"}</span>
              <button type="button" className="text-xs underline-offset-2 hover:underline" disabled={testing}
                onClick={() => { setWhich(t.key); start(async () => setMsg(await sendBotNow(t.key))); }}>
                {testing && which === t.key ? "sending…" : "send test"}
              </button>
            </div>
          );
        })}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button disabled={pending} className="btn">{pending ? "Saving…" : "Save times"}</button>
          {s && <span className={`text-sm ${s.error ? "text-bad" : "text-good"}`}>{s.error || s.ok}</span>}
          {msg && <span className={`text-sm ${msg.error ? "text-bad" : "text-good"}`}>{msg.error || msg.ok}</span>}
        </div>
        <p className="text-xs muted">⏰ Exact times need the free alarm clock (cron-job.org, SETUP.md step 14). Without it, only the default times work and messages can be up to an hour late.</p>
      </form>
    </section>
  );
}
