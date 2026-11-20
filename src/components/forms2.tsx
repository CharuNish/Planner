"use client";
import { useActionState, useState } from "react";
import { habitCheckIn, logMeasurements, logWeight, markRecipeMade, saveOpportunity } from "@/app/(app)/actions";

const today = () => new Date().toLocaleDateString("en-CA");
function Msg({ s }: { s: { ok?: string; error?: string } | null }) {
  if (!s) return null;
  return <p className={`text-sm ${s.error ? "text-bad" : "text-good"}`}>{s.error || s.ok}</p>;
}

export function WeightForm() {
  const [open, setOpen] = useState(false);
  const [s, action, pending] = useActionState(logWeight, null);
  if (!open) return <button className="btn" onClick={() => setOpen(true)}>+ Log weight</button>;
  return (
    <form action={action} className="card p-4 grid grid-cols-2 md:grid-cols-4 gap-2 items-center w-full">
      <input name="kg" type="number" step="0.1" placeholder="Weight (kg)" className="input" required />
      <input name="date" type="date" defaultValue={today()} className="input" />
      <input name="notes" placeholder="Notes (optional)" className="input" />
      <button disabled={pending} className="btn">{pending ? "Saving…" : "Save"}</button>
      <div className="col-span-full"><Msg s={s} /></div>
    </form>
  );
}

export function MadeItButton({ recipe, link, made }: { recipe: string; link: string; made: boolean }) {
  const [open, setOpen] = useState(false);
  const [s, action, pending] = useActionState(markRecipeMade, null);
  if (s?.ok) return <p className="text-sm text-good">{s.ok}</p>;
  if (!open) return (
    <button onClick={() => setOpen(true)} className={`text-sm rounded-lg px-3 py-1.5 font-medium ${made ? "soft" : "border"}`}>
      {made ? "✓ Made it · make again?" : "☐ I made this"}
    </button>
  );
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="recipe" value={recipe} /><input type="hidden" name="link" value={link} />
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer text-lg"><input type="radio" name="rating" value={n} className="peer sr-only" /><span className="opacity-40 peer-checked:opacity-100">⭐</span></label>
        ))}
      </div>
      <textarea name="comment" rows={2} placeholder="How did it turn out?" className="input w-full" />
      <div className="flex gap-2"><button disabled={pending} className="btn">{pending ? "Saving…" : "Save"}</button><button type="button" onClick={() => setOpen(false)} className="text-sm muted">Cancel</button></div>
      <Msg s={s} />
    </form>
  );
}

export function HabitForm({ sleepTarget, waterTarget }: { sleepTarget: number; waterTarget: number }) {
  const [s, action, pending] = useActionState(habitCheckIn, null);
  return (
    <form action={action} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-center">
      <label className="text-xs muted col-span-1">😴 Sleep (h)<input name="sleep" type="number" step="0.5" placeholder={`${sleepTarget}`} className="input w-full mt-1" /></label>
      <label className="text-xs muted col-span-1">💧 Water (glasses)<input name="water" type="number" placeholder={`${waterTarget}`} className="input w-full mt-1" /></label>
      <label className="text-sm flex items-center gap-2 mt-4"><input name="gym" type="checkbox" className="w-5 h-5 accent-[var(--accent)]" /> 🏋️ Went to gym</label>
      <label className="text-xs muted">Date<input name="date" type="date" defaultValue={today()} className="input w-full mt-1" /></label>
      <input name="notes" placeholder="Notes" className="input mt-4" />
      <button disabled={pending} className="btn mt-4">{pending ? "Saving…" : "Check in"}</button>
      <div className="col-span-full"><Msg s={s} /></div>
    </form>
  );
}

export function SaveOppButton({ o }: { o: { title: string; type: string; org: string; deadline: string | null; url: string } }) {
  const [s, action, pending] = useActionState(saveOpportunity, null);
  if (s?.ok) return <span className="text-xs text-good">{s.ok}</span>;
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="title" value={o.title} /><input type="hidden" name="type" value={o.type} />
      <input type="hidden" name="org" value={o.org} /><input type="hidden" name="deadline" value={o.deadline || ""} /><input type="hidden" name="link" value={o.url} />
      {o.deadline && <label className="text-xs muted flex items-center gap-1"><input type="checkbox" name="calendar" defaultChecked /> add deadline to calendar</label>}
      <button disabled={pending} className="text-xs rounded-lg px-2.5 py-1 border font-medium">{pending ? "Saving…" : "☆ Save"}</button>
      {s?.error && <span className="text-xs text-bad">{s.error}</span>}
    </form>
  );
}

export function MeasureForm({ last }: { last?: Record<string, number> }) {
  const [open, setOpen] = useState(false);
  const [s, action, pending] = useActionState(logMeasurements, null);
  if (!open) return <button className="text-sm rounded-lg border px-3 py-1.5" onClick={() => setOpen(true)}>📏 Add measurements</button>;
  const fields: [string, string][] = [["chest", "Chest"], ["waist", "Waist"], ["belly", "Belly"], ["hip", "Hip"], ["arms", "Arms"], ["thigh", "Thigh"]];
  return (
    <form action={action} className="card p-4 space-y-2 w-full">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {fields.map(([k, label]) => (
          <label key={k} className="text-xs muted">{label} (cm)<input name={k} type="number" step="0.1" placeholder={last?.[k] ? String(last[k]) : ""} className="input w-full mt-1" /></label>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <input name="date" type="date" defaultValue={today()} className="input" />
        <input name="notes" placeholder="Notes (optional)" className="input flex-1 min-w-40" />
        <button disabled={pending} className="btn">{pending ? "Saving…" : "Save"}</button>
        <button type="button" className="text-sm muted" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      <p className="text-xs muted">Measure at the same spot each time (e.g. belly at the belly button). Skip any you don&apos;t have; I&apos;ll reuse the last one.</p>
      <Msg s={s} />
    </form>
  );
}
