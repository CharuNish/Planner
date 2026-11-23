"use client";
import { startTransition, useActionState, useEffect, useState } from "react";
import { setGoalPhoto } from "@/app/(app)/actions";
import { shrink } from "@/components/wins";

/** Small "📷" button on a goal card: pick a photo from the computer/phone and it becomes the goal's picture. */
export function GoalPhotoButton({ goal, hasPhoto }: { goal: string; hasPhoto: boolean }) {
  const [s, action, pending] = useActionState(setGoalPhoto, null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<typeof s>(null);
  useEffect(() => { setMsg(s); if (s) { const t = setTimeout(() => setMsg(null), 4000); return () => clearTimeout(t); } }, [s]);
  const working = pending || busy;
  return (
    <>
      <label className={`absolute top-2 right-2 chip cursor-pointer text-xs ${working ? "opacity-70" : ""}`} style={{ background: "rgba(0,0,0,.55)", color: "white" }}
        title={hasPhoto ? "Change photo" : "Upload a photo"}>
        {working ? "⏳ Uploading…" : hasPhoto ? "📷 Change" : "📷 Add photo"}
        <input type="file" accept="image/*" className="hidden" disabled={working} onChange={async (e) => {
          const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
          setBusy(true);
          const fd = new FormData();
          fd.set("goal", goal);
          fd.set("photo", await shrink(f));
          setBusy(false);
          startTransition(() => action(fd));
        }} />
      </label>
      {msg && <span className={`absolute bottom-2 left-2 right-2 chip text-xs justify-center ${msg.error ? "text-bad" : "text-good"}`} style={{ background: "rgba(0,0,0,.75)" }}>{msg.error || msg.ok}</span>}
    </>
  );
}
