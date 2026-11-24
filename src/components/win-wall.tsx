"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { saveWinOrder } from "@/app/(app)/actions";

export type WallWin = { key: string; date: string; text: string; category: string; photo: string; icon: string };

// Soft pastel "photo" for wins without a picture, one per category.
const PASTEL: Record<string, [string, string]> = {
  fitness: ["#fbcfe8", "#fda4af"], mind: ["#ddd6fe", "#a5b4fc"], kindness: ["#fecdd3", "#f9a8d4"], learning: ["#bae6fd", "#c4b5fd"],
  career: ["#fde68a", "#fdba74"], fun: ["#fbcfe8", "#fde68a"], "self-care": ["#a7f3d0", "#bae6fd"], other: ["#e9d5ff", "#fbcfe8"],
};
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const tilt = (k: string) => ((hash(k) % 900) / 100 - 4.5); // -4.5° … +4.5°
const tapeTilt = (k: string) => ((hash(k + "t") % 1200) / 100 - 6);
const shortDate = (d: string) => { const [y, m, day] = d.split("-").map(Number); return new Date(y, m - 1, day).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); };

type Drag = { key: string; x: number; y: number; dx: number; dy: number; w: number; h: number };

export function WinWall({ items, handFont, demo }: { items: WallWin[]; handFont: string; demo: boolean }) {
  const [order, setOrder] = useState(items);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [open, setOpen] = useState<WallWin | null>(null);
  const [status, setStatus] = useState("");
  const [, startSave] = useTransition();

  const wrap = useRef<HTMLDivElement>(null);
  const slots = useRef(new Map<string, HTMLDivElement>());
  const prevPos = useRef(new Map<string, { x: number; y: number }>());
  const dragRef = useRef<Drag | null>(null);
  const orderRef = useRef(order);
  const startOrder = useRef("");
  const pending = useRef<{ key: string; x: number; y: number; type: string; timer: number; el: HTMLElement } | null>(null);
  const justDragged = useRef(false);
  const scrollV = useRef(0);
  const [paths, setPaths] = useState<string[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  orderRef.current = order;
  dragRef.current = drag;

  // New data from the server (after adding a win or saving) replaces the local order, unless you're mid-drag.
  const itemsSig = items.map((w) => w.key + w.photo).join("¦");
  useEffect(() => { if (!dragRef.current) setOrder(items); }, [itemsSig]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── The string: one sagging line per row, passing through the tape on each polaroid ──
  const drawString = useCallback(() => {
    const box = wrap.current; if (!box) return;
    const W = box.offsetWidth;
    const pts: { x: number; y: number }[] = [];
    for (const w of orderRef.current) { const el = slots.current.get(w.key); if (el) pts.push({ x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + 4 }); }
    const rows: { x: number; y: number }[][] = [];
    for (const p of pts) { const r = rows.find((row) => Math.abs(row[0].y - p.y) < 20); if (r) r.push(p); else rows.push([p]); }
    setPaths(rows.map((row) => {
      row.sort((a, b) => a.x - b.x);
      const all = [{ x: -8, y: row[0].y - 10 }, ...row, { x: W + 8, y: row[row.length - 1].y - 10 }];
      let d = `M ${all[0].x} ${all[0].y}`;
      for (let i = 1; i < all.length; i++) {
        const a = all[i - 1], b = all[i];
        const sag = Math.min(34, Math.abs(b.x - a.x) * 0.14);
        d += ` Q ${(a.x + b.x) / 2} ${Math.max(a.y, b.y) + sag} ${b.x} ${b.y}`;
      }
      return d;
    }));
    setSize({ w: W, h: box.offsetHeight });
  }, []);

  useEffect(() => {
    const box = wrap.current; if (!box) return;
    const ro = new ResizeObserver(() => drawString());
    ro.observe(box);
    return () => ro.disconnect();
  }, [drawString]);

  // ── Push-aside animation (like moving apps on a phone): each card glides from where it was to its new spot ──
  useLayoutEffect(() => {
    const next = new Map<string, { x: number; y: number }>();
    for (const [k, el] of slots.current) {
      const now = { x: el.offsetLeft, y: el.offsetTop };
      next.set(k, now);
      const was = prevPos.current.get(k);
      if (was && (was.x !== now.x || was.y !== now.y)) {
        el.style.transition = "none";
        el.style.transform = `translate(${was.x - now.x}px, ${was.y - now.y}px)`;
        void el.offsetWidth;
        el.style.transition = "transform 320ms cubic-bezier(.2,.9,.25,1.15)";
        el.style.transform = "";
      }
    }
    prevPos.current = next;
    drawString();
  }, [order, drawString]);

  // ── Dragging ──
  const moveTo = useCallback((px: number, py: number) => {
    const d = dragRef.current, box = wrap.current; if (!d || !box) return;
    const nd = { ...d, x: px, y: py }; dragRef.current = nd; setDrag(nd);
    const b = box.getBoundingClientRect();
    let best: string | null = null, bestDist = Infinity;
    for (const [k, el] of slots.current) {
      const cx = b.left + el.offsetLeft + el.offsetWidth / 2, cy = b.top + el.offsetTop + el.offsetHeight / 2;
      const inside = Math.abs(px - cx) < el.offsetWidth / 2 && Math.abs(py - cy) < el.offsetHeight / 2;
      const dist = Math.hypot(px - cx, py - cy);
      if (inside && dist < bestDist) { best = k; bestDist = dist; }
    }
    if (!best || best === d.key) return;
    const cur = orderRef.current;
    const from = cur.findIndex((w) => w.key === d.key), to = cur.findIndex((w) => w.key === best);
    if (from < 0 || to < 0) return;
    const next = cur.slice(); const [m] = next.splice(from, 1); next.splice(to, 0, m);
    orderRef.current = next; setOrder(next);
  }, []);

  const begin = useCallback((key: string, x: number, y: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    startOrder.current = orderRef.current.map((w) => w.key).join("¦");
    const d = { key, x, y, dx: x - r.left, dy: y - r.top, w: r.width, h: r.height };
    dragRef.current = d; setDrag(d);
    justDragged.current = true;
    navigator.vibrate?.(12);
  }, []);

  const finish = useCallback(() => {
    const p = pending.current; if (p) { clearTimeout(p.timer); pending.current = null; }
    if (!dragRef.current) return;
    dragRef.current = null; setDrag(null); scrollV.current = 0;
    const keys = orderRef.current.map((w) => w.key);
    if (keys.join("¦") === startOrder.current) return;
    setStatus("Saving…");
    startSave(async () => {
      const res = await saveWinOrder(keys);
      setStatus(res?.error ? `Couldn't save: ${res.error}` : demo ? "Demo: not saved" : "Order saved ✓");
      setTimeout(() => setStatus(""), 2600);
    });
  }, [demo]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const p = pending.current;
      if (p && !dragRef.current) {
        const moved = Math.hypot(e.clientX - p.x, e.clientY - p.y);
        if (p.type !== "touch" && moved > 5) { begin(p.key, p.x, p.y, p.el); clearTimeout(p.timer); pending.current = null; }
        else if (p.type === "touch" && moved > 10) { clearTimeout(p.timer); pending.current = null; } // finger is scrolling, not dragging
      }
      if (dragRef.current && e.pointerType !== "touch") {
        moveTo(e.clientX, e.clientY);
        const edge = 70, H = window.innerHeight;
        scrollV.current = e.clientY < edge ? -Math.ceil((edge - e.clientY) / 6) : e.clientY > H - edge ? Math.ceil((e.clientY - (H - edge)) / 6) : 0;
      }
    };
    // Phones: follow the finger with touch events (the browser cancels pointer events once it thinks you're scrolling).
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0]; if (!t) return;
      const p = pending.current;
      if (p && p.type === "touch" && !dragRef.current && Math.hypot(t.clientX - p.x, t.clientY - p.y) > 10) { clearTimeout(p.timer); pending.current = null; }
      if (!dragRef.current) return;
      if (e.cancelable) e.preventDefault();
      moveTo(t.clientX, t.clientY);
      const edge = 70, H = window.innerHeight;
      scrollV.current = t.clientY < edge ? -Math.ceil((edge - t.clientY) / 6) : t.clientY > H - edge ? Math.ceil((t.clientY - (H - edge)) / 6) : 0;
    };
    const onCancel = (e: PointerEvent) => { if (e.pointerType !== "touch" || !dragRef.current) finish(); };
    const noMenu = (e: Event) => { if (dragRef.current || pending.current) e.preventDefault(); };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", finish);
    window.addEventListener("touchcancel", finish);
    window.addEventListener("contextmenu", noMenu);
    let raf = 0;
    const tick = () => {
      if (scrollV.current && dragRef.current) { window.scrollBy(0, scrollV.current); moveTo(dragRef.current.x, dragRef.current.y); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", finish);
      window.removeEventListener("touchcancel", finish);
      window.removeEventListener("contextmenu", noMenu);
      cancelAnimationFrame(raf);
    };
  }, [begin, finish, moveTo]);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);

  const onDown = (w: WallWin) => (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    justDragged.current = false;
    const el = e.currentTarget, type = e.pointerType, x = e.clientX, y = e.clientY;
    // Mouse: just drag. Finger: press and hold for a moment, then drag (so normal scrolling still works).
    const timer = type !== "touch" ? 0 : window.setTimeout(() => { if (pending.current?.key === w.key) { const p = pending.current; pending.current = null; begin(w.key, p.x, p.y, p.el); } }, 260);
    pending.current = { key: w.key, x, y, type, timer, el };
  };

  const dragged = drag ? order.find((w) => w.key === drag.key) : null;

  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <p className="text-sm muted">Drag a polaroid to move it 💞 <span className="opacity-70">(on your phone: press and hold, then drag)</span></p>
        {status && <span className="chip soft text-xs">{status}</span>}
      </div>

      <div ref={wrap} className="win-wall relative grid gap-x-4 sm:gap-x-6 gap-y-14 pt-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(150px, 42vw), 1fr))" }}>
        <svg className="absolute inset-0 pointer-events-none" width={size.w} height={size.h} style={{ overflow: "visible", zIndex: 0 }} aria-hidden>
          {paths.map((d, i) => (
            <g key={i}>
              <path d={d} fill="none" stroke="rgba(0,0,0,.35)" strokeWidth={2.5} transform="translate(0 3)" style={{ transition: "d 320ms ease" }} />
              <path d={d} fill="none" stroke="#e9d3c0" strokeWidth={1.6} strokeDasharray="5 2" strokeLinecap="round" style={{ transition: "d 320ms ease" }} />
            </g>
          ))}
        </svg>

        {order.map((w) => {
          const isDrag = drag?.key === w.key;
          return (
            <div key={w.key} ref={(el) => { if (el) slots.current.set(w.key, el); else slots.current.delete(w.key); }} className="relative" style={{ zIndex: 1, maxWidth: 240, width: "100%", justifySelf: "center" }}>
              {/* The card stays in the page while you drag it (a phone stops sending touch moves if it disappears), just invisible. */}
              <div style={{ opacity: isDrag ? 0 : 1 }}>
                <Polaroid w={w} handFont={handFont} rotate={tilt(w.key)} onPointerDown={onDown(w)} onClick={() => { if (!justDragged.current) setOpen(w); }} />
              </div>
              {isDrag && <div className="absolute inset-0 rounded-sm border-2 border-dashed pointer-events-none" style={{ borderColor: "rgba(244,114,182,.55)", background: "rgba(244,114,182,.07)" }} />}
            </div>
          );
        })}
      </div>

      {drag && dragged && (
        <div className="fixed pointer-events-none" style={{ left: drag.x - drag.dx, top: drag.y - drag.dy, width: drag.w, zIndex: 80 }}>
          <Polaroid w={dragged} handFont={handFont} rotate={tilt(dragged.key) / 2} lifted />
        </div>
      )}

      {open && (
        <div className="fixed inset-0 grid place-items-center p-4" style={{ zIndex: 90, background: "rgba(5,3,10,.78)", backdropFilter: "blur(6px)" }} onClick={() => setOpen(null)}>
          <div className="w-full" style={{ maxWidth: 440 }}>
            <Polaroid w={open} handFont={handFont} rotate={-1.5} big />
            <p className="text-center text-xs muted mt-4">Tap anywhere to close</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Polaroid({ w, handFont, rotate, lifted, big, onPointerDown, onClick }: {
  w: WallWin; handFont: string; rotate: number; lifted?: boolean; big?: boolean;
  onPointerDown?: (e: React.PointerEvent<HTMLElement>) => void; onClick?: () => void;
}) {
  const [bad, setBad] = useState(false);
  const [c1, c2] = PASTEL[w.category.toLowerCase()] || PASTEL.other;
  const hasPhoto = w.photo && !bad;
  return (
    <article
      onPointerDown={onPointerDown} onClick={onClick}
      className={`polaroid relative select-none ${onPointerDown ? "cursor-pointer" : ""}`}
      style={{
        transform: `rotate(${rotate}deg) ${lifted ? "scale(1.08)" : ""}`,
        background: "#fbf7f2", padding: big ? "16px 16px 0" : "9px 9px 0", borderRadius: 3,
        boxShadow: lifted ? "0 28px 50px rgba(0,0,0,.55), 0 6px 14px rgba(0,0,0,.35)" : "0 10px 22px rgba(0,0,0,.45), 0 2px 5px rgba(0,0,0,.3)",
        touchAction: "manipulation", WebkitTouchCallout: "none", WebkitUserSelect: "none",
        transition: "box-shadow .2s, transform .2s",
      }}
    >
      {/* washi tape holding it on the string */}
      <span aria-hidden className="absolute left-1/2" style={{ top: big ? -14 : -11, width: big ? 92 : 64, height: big ? 26 : 20, transform: `translateX(-50%) rotate(${tapeTilt(w.key)}deg)`, background: "linear-gradient(90deg, rgba(232,196,214,.78), rgba(214,186,206,.72))", boxShadow: "0 1px 2px rgba(0,0,0,.18)", clipPath: "polygon(3% 0, 97% 4%, 100% 50%, 96% 100%, 2% 96%, 0 50%)" }} />
      <div className="relative overflow-hidden" style={{ aspectRatio: "4 / 5", background: `linear-gradient(140deg, ${c1}, ${c2})` }}>
        {hasPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={w.photo} alt={w.text} draggable={false} loading="lazy" referrerPolicy="no-referrer" onError={() => setBad(true)} className="absolute inset-0 w-full h-full object-cover" style={{ filter: "saturate(.92) contrast(1.03)" }} />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <span aria-hidden className="absolute" style={{ top: "12%", left: "14%", color: "rgba(255,255,255,.85)", fontSize: big ? 26 : 16 }}>✦</span>
            <span aria-hidden className="absolute" style={{ bottom: "16%", right: "14%", color: "rgba(255,255,255,.75)", fontSize: big ? 20 : 12 }}>✧</span>
            <span aria-hidden className="absolute" style={{ top: "22%", right: "20%", color: "rgba(255,255,255,.6)", fontSize: big ? 14 : 9 }}>♥</span>
            <span style={{ fontSize: big ? 96 : "clamp(2.6rem, 9vw, 3.6rem)", filter: "drop-shadow(0 4px 8px rgba(0,0,0,.15))" }}>{w.icon}</span>
          </div>
        )}
        <div aria-hidden className="absolute inset-0" style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06), inset 0 0 30px rgba(0,0,0,.12)" }} />
      </div>
      <div className="text-center" style={{ padding: big ? "14px 8px 18px" : "8px 4px 10px", minHeight: big ? 0 : 66 }}>
        <p className={handFont} style={{ color: "#3a2433", fontSize: big ? "1.7rem" : "clamp(1.02rem, 3.6vw, 1.22rem)", lineHeight: 1.12, ...(big ? {} : { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }) }}>{w.text}</p>
        <p style={{ color: "#9b8290", fontSize: big ? 13 : 10.5, marginTop: 3, letterSpacing: ".04em" }}>{shortDate(w.date)}{w.category && w.category !== "Other" ? ` · ${w.category}` : ""}</p>
      </div>
    </article>
  );
}
