"use client";
import { useActionState, useState, type ReactNode } from "react";
import { logHabit, logMeasurements, logWorkout, logWeight, markRecipeMade, saveOpportunity } from "@/app/(app)/actions";

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

type HabitVals = { sleep: number | null; water: number | null; gym: boolean | null; notes: string };

/** One small card per habit, each with its own Save, so you can log sleep, water and gym at different times. */
export function HabitLogger({ sleepTarget, waterTarget, days }: { sleepTarget: number; waterTarget: number; days: Record<string, HabitVals> }) {
  const [date, setDate] = useState(today());
  const d = days[date] || { sleep: null, water: null, gym: null, notes: "" };
  const isToday = date === today();
  return (
    <div className="space-y-3">
      <label className="text-xs muted flex items-center gap-2">Logging for
        <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value || today())} className="input" />
        {!isToday && <button type="button" onClick={() => setDate(today())} className="text-xs underline">back to today</button>}
        <span className="hidden md:inline">· each habit saves on its own</span>
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <HabitCard habit="sleep" date={date} title="😴 Sleep" now={d.sleep === null ? "not logged yet" : `${d.sleep} h logged`}>
          <input name="value" type="number" step="0.5" min="0" max="24" placeholder={`hours (goal ${sleepTarget})`} defaultValue={d.sleep ?? ""} key={`s${date}${d.sleep}`} className="input w-full" required />
          <SaveBtn label="Save sleep" />
        </HabitCard>
        <HabitCard habit="water" date={date} title="💧 Water" now={d.water === null ? `0 / ${waterTarget} glasses` : `${d.water} / ${waterTarget} glasses`}>
          <WaterButtons waterTarget={waterTarget} current={d.water} date={date} />
        </HabitCard>
        <HabitCard habit="gym" date={date} title="🏋️ Gym" now={d.gym === null ? "not logged yet" : d.gym ? "went ✓" : "rest day"}>
          <div className="flex gap-2">
            <button name="value" value="Yes" className="btn flex-1">Went 💪</button>
            <button name="value" value="No" className="flex-1 rounded-lg px-3 py-1.5 text-sm font-medium border">Rest day</button>
          </div>
        </HabitCard>
        <HabitCard habit="notes" date={date} title="📝 Note" now={d.notes ? d.notes : "optional"}>
          <input name="value" placeholder="How was the day?" defaultValue={d.notes} key={`n${date}${d.notes}`} className="input w-full" required />
          <SaveBtn label="Save note" />
        </HabitCard>
      </div>
    </div>
  );
}

function HabitCard({ habit, date, title, now, children }: { habit: string; date: string; title: string; now: string; children: ReactNode }) {
  const [s, action, pending] = useActionState(logHabit, null);
  return (
    <form action={action} className="rounded-xl border p-4 space-y-2" aria-busy={pending}>
      <input type="hidden" name="habit" value={habit} /><input type="hidden" name="date" value={date} />
      <div className="flex items-baseline justify-between gap-2"><span className="font-medium">{title}</span><span className="text-xs muted truncate">{now}</span></div>
      <fieldset disabled={pending} className="space-y-2">{children}</fieldset>
      {pending ? <p className="text-sm muted">Saving…</p> : <Msg s={s} />}
    </form>
  );
}

function SaveBtn({ label }: { label: string }) {
  return <button className="btn w-full">{label}</button>;
}

function WaterButtons({ waterTarget, current, date }: { waterTarget: number; current: number | null; date: string }) {
  const [custom, setCustom] = useState(false);
  if (custom) return (
    <div className="flex gap-2">
      <input name="value" type="number" min="0" placeholder="total glasses" defaultValue={current ?? ""} key={`w${date}${current}`} className="input w-full" required />
      <button className="btn">Set</button>
      <button type="button" onClick={() => setCustom(false)} className="text-xs muted">×</button>
    </div>
  );
  const pct = Math.min(100, ((current ?? 0) / Math.max(1, waterTarget)) * 100);
  return (
    <>
      <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--series-3)" }} /></div>
      <div className="flex gap-2">
        <button name="add" value="1" className="btn flex-1">+1 glass</button>
        <button type="button" onClick={() => setCustom(true)} className="rounded-lg px-3 py-1.5 text-sm font-medium border">Set total</button>
      </div>
    </>
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

const WORKOUT_ICON: Record<string, string> = { Strength: "🏋️‍♀️", Cardio: "🔥", HIIT: "⚡", Yoga: "🧘‍♀️", Pilates: "🤸‍♀️", Run: "🏃‍♀️", Walk: "🚶‍♀️", Dance: "💃" };
/** One-tap "What did you train?" logger (iPhone Shortcuts can't read workouts on every iPhone). */
export function WorkoutLogger({ choices, minutes, date }: { choices: string[]; minutes?: number; date?: string }) {
  const [type, setType] = useState("");
  const [s, action, pending] = useActionState(logWorkout, null);
  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {choices.map((c) => (
          <button key={c} type="button" onClick={() => setType(c)} className={`chip ${type === c ? "soft" : "muted"}`} style={type === c ? { outline: "1px solid var(--accent)" } : undefined}>
            {WORKOUT_ICON[c] || "💪"} {c}
          </button>
        ))}
      </div>
      <input type="hidden" name="type" value={type} />
      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-xs muted flex items-center gap-1">min<input name="minutes" type="number" min="1" defaultValue={minutes || 30} className="input w-20" /></label>
        <input name="date" type="date" defaultValue={date || today()} className="input" />
        <button disabled={pending || !type} className="btn">{pending ? "Saving…" : "Log it"}</button>
      </div>
      <Msg s={s} />
    </form>
  );
}
