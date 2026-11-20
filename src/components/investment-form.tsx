"use client";
import { useActionState, useState } from "react";
import { addInvestment } from "@/app/(app)/investment-actions";

const today = () => new Date().toLocaleDateString("en-CA");
const TYPES = ["Fixed Deposit", "Treasury Bill", "Treasury Bond", "Unit Trust", "Stocks (CSE)", "Gold", "Savings Account", "Other"];

export function AddInvestmentForm() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("Fixed Deposit");
  const [s, action, pending] = useActionState(addInvestment, null);
  if (!open) return <button onClick={() => setOpen(true)} className="btn">+ Add FD / investment</button>;
  const fixed = /deposit|bill|bond/i.test(type);
  return (
    <form action={action} className="card p-4 grid grid-cols-2 md:grid-cols-4 gap-2 items-end w-full">
      <label className="text-xs muted">Type<select name="type" className="input w-full mt-1" value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
      <label className="text-xs muted">Name<input name="name" placeholder={fixed ? "e.g. FD 12 months" : "e.g. CAL money market"} className="input w-full mt-1" /></label>
      <label className="text-xs muted">Bank / where<input name="institution" placeholder="e.g. Commercial Bank" className="input w-full mt-1" /></label>
      <label className="text-xs muted">Amount put in<input name="amount" type="number" step="0.01" min={0} placeholder="500000" className="input w-full mt-1" required /></label>
      <label className="text-xs muted">Start date<input name="start" type="date" defaultValue={today()} className="input w-full mt-1" /></label>
      {fixed ? (<>
        <label className="text-xs muted">Interest rate % (yearly)<input name="rate" type="number" step="0.01" min={0} placeholder="10.5" className="input w-full mt-1" /></label>
        <label className="text-xs muted">Term (months)<input name="term" type="number" min={0} placeholder="12" className="input w-full mt-1" /></label>
        <label className="text-xs muted">or Maturity date<input name="maturity" type="date" className="input w-full mt-1" /></label>
        <label className="text-xs muted">Interest paid<select name="payout" className="input w-full mt-1"><option>At Maturity</option><option>Monthly</option><option>Yearly</option></select></label>
        <label className="text-xs muted flex items-center gap-2 pb-2"><input name="renew" type="checkbox" /> Auto-renews</label>
      </>) : (<>
        <label className="text-xs muted">Worth today (optional)<input name="current" type="number" step="0.01" min={0} placeholder="leave empty if same" className="input w-full mt-1" /></label>
        {type === "Savings Account" && <label className="text-xs muted">Interest rate %<input name="rate" type="number" step="0.01" min={0} placeholder="3" className="input w-full mt-1" /></label>}
      </>)}
      <label className="text-xs muted">Status<select name="status" className="input w-full mt-1" defaultValue=""><option value="">Auto (future date = Planned)</option><option>Active</option><option>Planned</option></select></label>
      <label className="text-xs muted col-span-2">Notes<input name="notes" placeholder="certificate no., why, etc." className="input w-full mt-1" /></label>
      <div className="flex gap-2 items-center col-span-2 md:col-span-1">
        <button disabled={pending} className="btn">{pending ? "Saving…" : "Save"}</button>
        <button type="button" className="text-sm muted" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      {s && <p className={`col-span-full text-sm ${s.error ? "text-bad" : "text-good"}`}>{s.error || s.ok}</p>}
    </form>
  );
}
