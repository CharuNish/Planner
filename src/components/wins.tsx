"use client";
import { useActionState, useRef, useState, useTransition } from "react";
import { addWin, sendMorningNow } from "@/app/(app)/actions";

const today = () => new Date().toLocaleDateString("en-CA");
const CATS = [["Fitness", "🏃‍♀️"], ["Mind", "🧘‍♀️"], ["Kindness", "💝"], ["Learning", "🧠"], ["Career", "💼"], ["Fun", "🎉"], ["Self-care", "🛁"], ["Love", "💗"], ["Travel", "✈️"], ["Tough day", "🌧️"], ["Lesson", "🌱"], ["Other", "✨"]] as const;

/** Shrinks a phone photo (often 5-10 MB) to a ~1600px JPEG so it uploads fast and stays small. */
export async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 600_000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.82));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch { return file; }
}

export function WinForm({ compact = false }: { compact?: boolean }) {
  const [s, action, pending] = useActionState(addWin, null);
  const [cat, setCat] = useState("Other");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<File | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function submit(fd: FormData) {
    fd.delete("photo");
    if (fileRef.current) fd.set("photo", fileRef.current);
    await action(fd);
  }
  return (
    <form ref={formRef} action={submit} className="space-y-3"
      onSubmit={() => setTimeout(() => { if (formRef.current) { formRef.current.reset(); fileRef.current = null; setPreview(null); } }, 50)}>
      <textarea name="text" required rows={compact ? 2 : 3} placeholder="Walked 10k steps 👟 · Sunset with the girls 🌅 · Rough day, cried, still showed up 🌧️…" className="input w-full resize-none" />
      <div className="flex flex-wrap gap-1.5">
        {CATS.map(([k, icon]) => (
          <button type="button" key={k} onClick={() => setCat(k)} className={`chip text-xs ${cat === k ? "ring-2 ring-[var(--accent)]" : "soft"}`}>{icon} {k}</button>
        ))}
        <input type="hidden" name="category" value={cat} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="btn cursor-pointer">
          📸 {preview ? "Change photo" : "Add photo"}
          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            setBusy(true); fileRef.current = await shrink(f); setPreview(URL.createObjectURL(fileRef.current)); setBusy(false);
          }} />
        </label>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-12 w-12 rounded-lg object-cover" />
        )}
        <input name="date" type="date" defaultValue={today()} className="input" />
        <button disabled={pending || busy} className="btn ml-auto">{pending ? "Saving…" : busy ? "Shrinking photo…" : "Save this memory 📸"}</button>
      </div>
      {s && <p className={`text-sm ${s.error ? "text-bad" : "text-good"}`}>{s.error || s.ok}</p>}
    </form>
  );
}

export function SendMorningButton() {
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className="btn" disabled={pending} onClick={() => start(async () => setMsg(await sendMorningNow()))}>{pending ? "Writing it…" : "💌 Send me the morning message now"}</button>
      {msg && <span className={`text-xs ${msg.error ? "text-bad" : "text-good"}`}>{msg.error || msg.ok}</span>}
    </div>
  );
}
