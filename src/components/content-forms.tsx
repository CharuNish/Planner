"use client";
import { useActionState, useState } from "react";
import { logFollowers } from "@/app/(app)/content-actions";

const today = () => new Date().toLocaleDateString("en-CA");

export function FollowersForm({ accounts }: { accounts: { channel: string; platform: string; followers: number | null }[] }) {
  const [open, setOpen] = useState(false);
  const [s, action, pending] = useActionState(logFollowers, null);
  if (!open) return <button className="pill-btn" onClick={() => setOpen(true)}>💌 Log follower counts</button>;
  return (
    <form action={action} className="space-y-3 w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {accounts.map((a) => (
          <label key={`${a.channel}|${a.platform}`} className="text-xs muted">{a.channel} · {a.platform}
            <input name={`f:${a.channel}|${a.platform}`} type="number" min={0} placeholder={a.followers ? String(a.followers) : "followers"} className="input w-full mt-1" />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <input name="date" type="date" defaultValue={today()} className="input" />
        <button disabled={pending} className="btn">{pending ? "Saving…" : "Save"}</button>
        <button type="button" className="text-sm muted" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      {s && <p className={`text-sm ${s.error ? "text-bad" : "text-good"}`}>{s.error || s.ok}</p>}
    </form>
  );
}
