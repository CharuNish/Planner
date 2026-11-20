"use client";
import { useActionState, useState } from "react";
import { addEvent, addTransaction, logStudy } from "@/app/(app)/actions";

const today = () => new Date().toLocaleDateString("en-CA");

function Msg({ s }: { s: { ok?: string; error?: string } | null }) {
  if (!s) return null;
  return <p className={`text-sm ${s.error ? "text-bad" : "text-good"}`}>{s.error || s.ok}</p>;
}

function Toggle({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return open ? <>{children}</> : <button onClick={() => setOpen(true)} className="btn">{label}</button>;
}

export function AddTransactionForm({ categories }: { categories: string[] }) {
  const [s, action, pending] = useActionState(addTransaction, null);
  return (
    <Toggle label="+ Add income / expense">
      <form action={action} className="card p-4 grid grid-cols-2 md:grid-cols-7 gap-2 items-center w-full">
        <select name="type" className="input"><option>Expense</option><option>Income</option></select>
        <input name="amount" type="number" step="0.01" placeholder="Amount" className="input" required />
        <input name="category" list="cats" placeholder="Category" className="input" required />
        <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        <input name="description" placeholder="What for?" className="input" />
        <input name="method" placeholder="Cash / Card" className="input" />
        <input name="date" type="date" defaultValue={today()} className="input" />
        <button disabled={pending} className="btn">{pending ? "Saving…" : "Save"}</button>
        <div className="col-span-full"><Msg s={s} /></div>
      </form>
    </Toggle>
  );
}

export function LogStudyForm({ subjects }: { subjects: string[] }) {
  const [s, action, pending] = useActionState(logStudy, null);
  return (
    <Toggle label="+ Log study hours">
      <form action={action} className="card p-4 grid grid-cols-2 md:grid-cols-5 gap-2 items-center w-full">
        <input name="hours" type="number" step="0.25" placeholder="Hours" className="input" required />
        <input name="subject" list="subs" placeholder="Subject" className="input" />
        <datalist id="subs">{subjects.map((c) => <option key={c} value={c} />)}</datalist>
        <input name="notes" placeholder="Notes" className="input" />
        <input name="date" type="date" defaultValue={today()} className="input" />
        <button disabled={pending} className="btn">{pending ? "Saving…" : "Save"}</button>
        <div className="col-span-full"><Msg s={s} /></div>
      </form>
    </Toggle>
  );
}

export function AddEventForm({ categories }: { categories: readonly string[] }) {
  const [s, action, pending] = useActionState(addEvent, null);
  return (
    <Toggle label="+ Add to calendar">
      <form action={action} className="card p-4 grid grid-cols-2 md:grid-cols-7 gap-2 items-center w-full">
        <input name="title" placeholder="Title" className="input col-span-2" required />
        <select name="category" className="input">{categories.map((c) => <option key={c}>{c}</option>)}</select>
        <input name="date" type="date" defaultValue={today()} className="input" required />
        <input name="time" type="time" className="input" title="Leave empty for all-day" />
        <select name="repeat" className="input" defaultValue="">
          <option value="">No repeat</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option><option value="YEARLY">Yearly</option>
        </select>
        <button disabled={pending} className="btn">{pending ? "Adding…" : "Add"}</button>
        <input type="hidden" name="duration" value="60" />
        <div className="col-span-full"><Msg s={s} /></div>
      </form>
    </Toggle>
  );
}
