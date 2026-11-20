"use client";
import { useActionState, useState } from "react";
import { addToQueue, generateCaption, logFollowers, markPosted, skipQueued, updateStats } from "@/app/(app)/content-actions";
import type { Caption, Post, QueueItem } from "@/lib/content";

const today = () => new Date().toLocaleDateString("en-CA");
function Msg({ s }: { s: { ok?: string; error?: string } | null }) {
  if (!s) return null;
  return <p className={`text-sm ${s.error ? "text-bad" : "text-good"}`}>{s.error || s.ok}</p>;
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  if (!text) return null;
  return (
    <button type="button" className="text-xs rounded-md border px-2 py-1 shrink-0" onClick={async () => { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}>
      {done ? "✓ Copied" : `⧉ ${label}`}
    </button>
  );
}

function Field({ label, text }: { label: string; text: string }) {
  if (!text) return null;
  return (
    <div className="rounded-lg p-3" data-tile="">
      <div className="flex items-center justify-between gap-2 mb-1"><span className="kicker">{label}</span><CopyButton text={text} /></div>
      <p className="text-sm whitespace-pre-wrap">{text}</p>
    </div>
  );
}

export function CaptionView({ c, watched }: { c: Caption; watched?: boolean }) {
  const all = [c.caption, c.hashtags].filter(Boolean).join("\n\n");
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs muted">{watched === undefined ? "Saved caption" : watched ? "✨ Written after watching your video" : "✨ Written from the file name and your note"}</span>
        <CopyButton text={all} label="Copy caption + hashtags" />
      </div>
      <Field label="Title" text={c.title} />
      <Field label="Hook (first 3 seconds)" text={c.hook} />
      <Field label="Caption" text={c.caption} />
      <Field label="Hashtags" text={c.hashtags} />
      <Field label="On-screen text" text={c.onScreen} />
      <Field label="Sinhala caption" text={c.sinhala} />
      {c.bestTime && <p className="text-xs muted">🕒 {c.bestTime}</p>}
    </div>
  );
}

export function CaptionMaker({ item, saved }: { item: QueueItem; saved?: Caption }) {
  const [s, action, pending] = useActionState(generateCaption, null);
  const [again, setAgain] = useState(false);
  const c = s?.caption || (!again ? saved : undefined);
  return (
    <div className="space-y-3">
      {c && <CaptionView c={c} watched={s?.caption?.watched} />}
      <form action={action} className="flex flex-wrap gap-2 items-center">
        <input type="hidden" name="fileId" value={item.fileId} /><input type="hidden" name="channel" value={item.channel} />
        <input type="hidden" name="platform" value={item.platform} /><input type="hidden" name="name" value={item.name} />
        <input name="note" defaultValue={item.description} placeholder="What's this video about? (helps a lot)" className="input flex-1 min-w-[200px]" />
        <button disabled={pending} className="btn" onClick={() => setAgain(true)}>{pending ? "Writing… (up to a minute)" : c ? "↻ Write a new one" : "✨ Write caption + hashtags"}</button>
      </form>
      {s?.error && <p className="text-sm text-bad">{s.error}</p>}
    </div>
  );
}

export function PostedButton({ item, caption }: { item: QueueItem; caption?: Caption }) {
  const [open, setOpen] = useState(false);
  const [s, action, pending] = useActionState(markPosted, null);
  if (s?.ok) return <p className="text-sm text-good">{s.ok}</p>;
  if (!open) return <button className="text-sm rounded-lg border px-3 py-1.5 font-medium" onClick={() => setOpen(true)}>✓ I posted this</button>;
  const type = item.platform === "YouTube" ? (item.seconds && item.seconds > 60 ? "Video" : "Short") : item.platform === "Facebook" ? "Post" : item.mimeType.startsWith("image") ? "Post" : "Reel";
  return (
    <form action={action} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center w-full">
      {Object.entries({ row: String(item.row || ""), fileId: item.fileId, channel: item.channel, platform: item.platform, name: item.name, title: caption?.title || item.name.replace(/\.[^.]+$/, ""), caption: caption?.caption || "", hashtags: caption?.hashtags || "", type }).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <input name="link" placeholder="Link to the post (optional)" className="input sm:col-span-2" />
      <input name="date" type="date" defaultValue={today()} className="input" />
      <button disabled={pending} className="btn">{pending ? "Saving…" : "Save"}</button>
      <div className="sm:col-span-4"><Msg s={s} /></div>
    </form>
  );
}

export function StatsForm({ post }: { post: Post }) {
  const [open, setOpen] = useState(false);
  const [s, action, pending] = useActionState(updateStats, null);
  if (!open) return <button className="text-xs rounded-md border px-2 py-1" onClick={() => setOpen(true)}>{post.views ? "Update" : "+ Add stats"}</button>;
  return (
    <form action={action} className="grid grid-cols-3 gap-1.5 items-center mt-2 w-64 ml-auto text-left">
      <input type="hidden" name="row" value={post.row} />
      {(["views", "likes", "comments", "shares", "saves"] as const).map((k) => <input key={k} name={k} type="number" min={0} placeholder={k[0].toUpperCase() + k.slice(1)} defaultValue={post[k] || ""} className="input text-xs" />)}
      {!post.link && <input name="link" placeholder="Post link" className="input text-xs" />}
      <button disabled={pending} className="btn text-xs">{pending ? "…" : "Save"}</button>
      <div className="col-span-full"><Msg s={s} /></div>
    </form>
  );
}

export function FollowersForm({ accounts }: { accounts: { channel: string; platform: string; followers?: number }[] }) {
  const [open, setOpen] = useState(false);
  const [s, action, pending] = useActionState(logFollowers, null);
  if (!open) return <button className="text-sm rounded-lg border px-3 py-1.5" onClick={() => setOpen(true)}>+ Log follower counts</button>;
  return (
    <form action={action} className="space-y-2 w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {accounts.map((a) => (
          <label key={`${a.channel}|${a.platform}`} className="text-xs muted">{a.channel} · {a.platform}
            <input name={`f:${a.channel}|${a.platform}`} type="number" min={0} placeholder={a.followers ? String(a.followers) : "followers"} className="input w-full mt-1" />
          </label>
        ))}
      </div>
      <div className="flex gap-2 items-center"><input name="date" type="date" defaultValue={today()} className="input" /><button disabled={pending} className="btn">{pending ? "Saving…" : "Save"}</button><button type="button" className="text-sm muted" onClick={() => setOpen(false)}>Cancel</button></div>
      <Msg s={s} />
    </form>
  );
}

export function SkipButton({ row }: { row?: number }) {
  if (!row) return null;
  return <form action={skipQueued}><input type="hidden" name="row" value={row} /><button className="text-xs muted hover:text-white">✕ Remove from queue</button></form>;
}

export function AddToQueueForm({ accounts }: { accounts: { channel: string; platform: string }[] }) {
  const [open, setOpen] = useState(false);
  const [s, action, pending] = useActionState(addToQueue, null);
  if (!open) return <button className="btn" onClick={() => setOpen(true)}>+ Add videos to queue</button>;
  return (
    <form action={action} className="card p-4 space-y-3 w-full">
      <label className="text-xs muted block">Video names (one per line, e.g. the file name on your phone or laptop)
        <textarea name="names" rows={3} required placeholder={"rice cooker biryani\nmorning routine"} className="input w-full mt-1" />
      </label>
      <div>
        <div className="text-xs muted mb-1.5">Post to (tick all that apply)</div>
        <div className="flex flex-wrap gap-2">
          {accounts.map((a) => (
            <label key={a.channel + a.platform} className="text-sm flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 cursor-pointer">
              <input type="checkbox" name="account" value={`${a.channel}|${a.platform}`} className="accent-[var(--accent)]" /> {a.channel} · {a.platform}
            </label>
          ))}
        </div>
      </div>
      <input name="note" placeholder="What's it about? (optional, used for captions)" className="input w-full" />
      <div className="flex gap-2 items-center"><button disabled={pending} className="btn">{pending ? "Adding…" : "Add to queue"}</button><button type="button" className="text-sm muted" onClick={() => setOpen(false)}>Close</button></div>
      <Msg s={s} />
    </form>
  );
}
