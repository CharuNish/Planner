"use client";
import { useState } from "react";

/** Switch between the 3D figure and the side-by-side line drawings. */
export function BodyViews({ three, lines }: { three: React.ReactNode; lines: React.ReactNode }) {
  const [mode, setMode] = useState<"3d" | "lines">("3d");
  return (
    <div>
      <div className="flex justify-center gap-1 mb-2">
        {([["3d", "🧊 3D"], ["lines", "✏️ Side by side"]] as const).map(([m, label]) => (
          <button key={m} type="button" onClick={() => setMode(m)} className={`text-xs rounded-full px-3 py-1 ${mode === m ? "soft font-semibold" : "muted border"}`}>{label}</button>
        ))}
      </div>
      {mode === "3d" ? three : lines}
    </div>
  );
}
