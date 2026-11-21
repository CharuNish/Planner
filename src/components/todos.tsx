"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { addTodo, completeTodo } from "@/app/(app)/actions";

type Prio = "High" | "Medium" | "Low";
export type TodoItem = { task: string; priority: Prio; added: string; row: number };

const STYLE: Record<Prio, { icon: string; color: string }> = {
  High: { icon: "🔥", color: "var(--bad)" },
  Medium: { icon: "⚡", color: "var(--warn)" },
  Low: { icon: "🌿", color: "var(--good)" },
};

function ago(iso: string) {
  if (!iso) return "";
  const d = Math.round((Date.parse(new Date().toLocaleDateString("en-CA")) - Date.parse(iso)) / 86400000);
  return d <= 0 ? "added today" : d === 1 ? "added yesterday" : `added ${d} days ago`;
}

/** Home "To-dos" list: everything that isn't studies. High first, then Medium, then Low. Tick = gone. */
export function TodoList({ items, demo }: { items: TodoItem[]; demo: boolean }) {
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [leaving, setLeaving] = useState<Set<number>>(new Set());
  const [err, setErr] = useState<string | null>(null);
  const [, start] = useTransition();
  // When the page reloads with fresh data, forget the rows hidden in this visit.
  useEffect(() => { setHidden(new Set()); setLeaving(new Set()); }, [items]);

  function tick(t: TodoItem) {
    setErr(null);
    setLeaving((s) => new Set(s).add(t.row));
    // Short fade so the tick is visible, then the to-do disappears.
    setTimeout(() => setHidden((s) => new Set(s).add(t.row)), 450);
    if (demo) return;
    start(async () => {
      const r = await completeTodo(t.row, t.task);
      if (r?.error) {
        setErr(r.error);
        setHidden((s) => { const n = new Set(s); n.delete(t.row); return n; });
        setLeaving((s) => { const n = new Set(s); n.delete(t.row); return n; });
      }
    });
  }

  const shown = items.filter((t) => !hidden.has(t.row));
  const counts = { High: 0, Medium: 0, Low: 0 } as Record<Prio, number>;
  shown.forEach((t) => counts[t.priority]++);

  return (
    <div className="space-y-4">
      <TodoForm />
      {shown.length ? (
        <>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {(Object.keys(counts) as Prio[]).filter((p) => counts[p]).map((p) => (
              <span key={p} className="chip soft">{STYLE[p].icon} {counts[p]} {p.toLowerCase()}</span>
            ))}
          </div>
          <ul className="space-y-2">
            {shown.map((t) => {
              const going = leaving.has(t.row);
              return (
                <li key={t.row} className="flex items-center gap-3 rounded-xl px-3 py-2.5 soft transition-all duration-300"
                  style={{ borderLeft: `3px solid ${STYLE[t.priority].color}`, opacity: going ? 0.35 : 1, transform: going ? "translateX(12px)" : undefined }}>
                  <button type="button" aria-label={`Tick off ${t.task}`} disabled={going} onClick={() => tick(t)}
                    className="w-6 h-6 shrink-0 rounded-md border-2 grid place-items-center text-sm transition-colors"
                    style={{ borderColor: STYLE[t.priority].color, background: going ? STYLE[t.priority].color : "transparent", color: "#fff" }}>
                    {going ? "✓" : ""}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-medium break-words ${going ? "line-through" : ""}`}>{t.task}</div>
                    <div className="text-xs muted">{ago(t.added)}</div>
                  </div>
                  <span className="chip text-xs shrink-0" style={{ color: STYLE[t.priority].color }}>{STYLE[t.priority].icon} {t.priority}</span>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="text-sm muted text-center py-4">Nothing on the list. Go touch grass, bestie 🌸</p>
      )}
      {err && <p className="text-sm text-bad">{err}</p>}
      {demo && <p className="text-xs muted">Sample to-dos. Connect your Life sheet to save real ones.</p>}
    </div>
  );
}

function TodoForm() {
  const [s, action, pending] = useActionState(addTodo, null);
  const [prio, setPrio] = useState<Prio>("Medium");
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (s?.ok) { formRef.current?.reset(); setPrio("Medium"); } }, [s]);
  return (
    <form ref={formRef} action={action} className="space-y-2">
      <div className="flex gap-2">
        <input name="task" required maxLength={200} placeholder="Edit the new vlog 🎬" className="input flex-1 min-w-0" />
        <button disabled={pending} className="btn shrink-0">{pending ? "Adding…" : "Add"}</button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs muted mr-1">Priority:</span>
        {(["High", "Medium", "Low"] as Prio[]).map((p) => (
          <button type="button" key={p} onClick={() => setPrio(p)}
            className={`chip text-xs ${prio === p ? "ring-2" : "soft"}`} style={prio === p ? { color: STYLE[p].color, ["--tw-ring-color" as string]: STYLE[p].color } : undefined}>
            {STYLE[p].icon} {p}
          </button>
        ))}
        <input type="hidden" name="priority" value={prio} />
      </div>
      {s?.error && <p className="text-sm text-bad">{s.error}</p>}
      {s?.ok && <p className="text-sm text-good">{s.ok}</p>}
    </form>
  );
}
