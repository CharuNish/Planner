"use client";
// Celebration animations, shared by every tab.
// Each tab uses a different one so wins never feel copy-paste:
//   fireworks → Studies (deadline finished)      coins   → Finance (saved more than last month)
//   balloons  → Milestones (goal achieved)       hearts  → Content (follower goal hit)
//   confetti / stars → spare ones (e.g. Body & Health step goal)
// No libraries: one <canvas> drawn for ~5 seconds, then removed.
import { useEffect, useState } from "react";

export type CelebrationKind = "fireworks" | "coins" | "balloons" | "hearts" | "confetti" | "stars";
export type Achievement = { id: string; text: string };

const PALETTE: Record<CelebrationKind, string[]> = {
  fireworks: ["#f472b6", "#a78bfa", "#22d3ee", "#fde047", "#fb7185", "#34d399"],
  coins: ["#fde047", "#facc15", "#fbbf24", "#f59e0b"],
  balloons: ["#f9a8d4", "#f472b6", "#c4b5fd", "#a78bfa", "#fda4af", "#67e8f9", "#fde68a"],
  hearts: ["#f9a8d4", "#f472b6", "#ec4899", "#fda4af", "#e879f9"],
  confetti: ["#f472b6", "#a78bfa", "#22d3ee", "#fde047", "#34d399", "#fb7185"],
  stars: ["#fde68a", "#fef9c3", "#f9a8d4", "#c4b5fd", "#ffffff"],
};

type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; spin: number; rot: number; kind?: number; trail?: boolean; sway?: number };

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

function heart(ctx: CanvasRenderingContext2D, s: number) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.3);
  ctx.bezierCurveTo(-s, -s * 0.4, -s * 0.5, -s * 1.1, 0, -s * 0.5);
  ctx.bezierCurveTo(s * 0.5, -s * 1.1, s, -s * 0.4, 0, s * 0.3);
  ctx.fill();
}
function star(ctx: CanvasRenderingContext2D, s: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? s * 0.42 : s, a = (Math.PI / 5) * i - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
}

/** Plays one celebration over the whole screen. Safe to call from anywhere in the browser. */
export function playCelebration(kind: CelebrationKind, durationMs = 5200) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100vw", height: "100vh", pointerEvents: "none", zIndex: "90" });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) { canvas.remove(); return; }
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let W = 0, H = 0;
  const resize = () => { W = window.innerWidth; H = window.innerHeight; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  resize();
  window.addEventListener("resize", resize);

  const colors = PALETTE[kind];
  const ps: P[] = [];
  const t0 = performance.now();
  let last = t0, nextSpawn = 0, raf = 0;
  const g = { fireworks: 0.05, coins: 0.18, balloons: -0.035, hearts: -0.05, confetti: 0.12, stars: 0.0 }[kind];

  const burst = (x: number, y: number) => {
    const c1 = pick(colors), c2 = pick(colors), n = 70;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n, sp = rnd(1.5, 5.5);
      ps.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: rnd(55, 85), size: rnd(1.6, 2.8), color: i % 3 ? c1 : c2, spin: 0, rot: 0, trail: true });
    }
  };
  const spawn = (elapsed: number) => {
    if (kind === "fireworks") {
      // a rocket that climbs and pops
      ps.push({ x: rnd(W * 0.15, W * 0.85), y: H + 5, vx: rnd(-0.6, 0.6), vy: rnd(-11, -8.5), life: 0, max: rnd(40, 55), size: 2.5, color: "#fff7ed", spin: 0, rot: 0, kind: 1 });
      nextSpawn = elapsed + rnd(260, 520);
    } else if (kind === "coins") {
      for (let i = 0; i < 4; i++) ps.push({ x: rnd(0, W), y: rnd(-60, -10), vx: rnd(-0.6, 0.6), vy: rnd(1, 3), life: 0, max: 400, size: rnd(9, 15), color: pick(colors), spin: rnd(0.05, 0.15), rot: rnd(0, 6), kind: Math.random() < 0.18 ? 2 : 0 });
      nextSpawn = elapsed + 70;
    } else if (kind === "balloons") {
      ps.push({ x: rnd(W * 0.05, W * 0.95), y: H + rnd(40, 120), vx: 0, vy: rnd(-2.6, -1.6), life: 0, max: 600, size: rnd(20, 34), color: pick(colors), spin: rnd(0.01, 0.03), rot: rnd(0, 6), sway: rnd(0.6, 1.6) });
      nextSpawn = elapsed + rnd(110, 200);
    } else if (kind === "hearts") {
      for (let i = 0; i < 2; i++) ps.push({ x: rnd(0, W), y: H + 20, vx: rnd(-0.4, 0.4), vy: rnd(-3.5, -1.8), life: 0, max: 500, size: rnd(8, 20), color: pick(colors), spin: rnd(0.02, 0.05), rot: rnd(0, 6), sway: rnd(0.5, 1.4) });
      nextSpawn = elapsed + 60;
    } else if (kind === "confetti") {
      for (const side of [0, 1]) for (let i = 0; i < 10; i++) {
        const a = side ? rnd(-2.4, -1.9) : rnd(-1.25, -0.75), sp = rnd(9, 15);
        ps.push({ x: side ? W + 5 : -5, y: H * 0.85, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 400, size: rnd(5, 9), color: pick(colors), spin: rnd(0.1, 0.3), rot: rnd(0, 6), kind: Math.floor(rnd(0, 3)) });
      }
      nextSpawn = elapsed + 380;
    } else {
      for (let i = 0; i < 3; i++) ps.push({ x: rnd(0, W), y: rnd(0, H), vx: 0, vy: rnd(-0.3, 0.3), life: 0, max: rnd(70, 120), size: rnd(5, 13), color: pick(colors), spin: rnd(0.01, 0.04), rot: rnd(0, 6) });
      nextSpawn = elapsed + 50;
    }
  };

  const frame = (t: number) => {
    const elapsed = t - t0;
    const k = Math.min(3, (t - last) / 16.7);
    last = t;
    if (elapsed < durationMs - 1200 && elapsed >= nextSpawn) spawn(elapsed);
    if (kind === "fireworks") { ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = "lighter"; }
    else { ctx.globalCompositeOperation = "source-over"; ctx.clearRect(0, 0, W, H); }

    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life += k;
      p.vy += g * k;
      if (p.trail) { p.vx *= 0.985; p.vy *= 0.985; }
      if (kind === "confetti") { p.vx *= 0.97; p.vy = Math.min(p.vy, 3.2); }
      const sway = p.sway ? Math.sin(p.life * 0.05 + p.rot) * p.sway : 0;
      p.x += (p.vx + sway) * k;
      p.y += p.vy * k;
      p.rot += p.spin * k;
      if (kind === "fireworks" && p.kind === 1 && (p.vy > -1.5 || p.life > p.max)) { burst(p.x, p.y); ps.splice(i, 1); continue; }
      const fade = p.trail || kind === "stars" ? 1 - p.life / p.max : 1;
      if (fade <= 0 || p.y > H + 80 || p.y < -160) { ps.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = kind === "stars" ? Math.sin(Math.PI * (p.life / p.max)) : Math.max(0, fade);
      ctx.translate(p.x, p.y);
      ctx.fillStyle = p.color;
      if (kind === "fireworks") {
        ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill();
      } else if (kind === "coins") {
        if (p.kind === 2) { ctx.rotate(Math.sin(p.rot) * 0.4); ctx.font = `${p.size * 2}px system-ui`; ctx.fillText("💸", -p.size, p.size * 0.6); }
        else {
          const w = Math.abs(Math.cos(p.rot)) * p.size;
          ctx.beginPath(); ctx.ellipse(0, 0, Math.max(1, w), p.size, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "#b45309"; ctx.lineWidth = 1.5; ctx.stroke();
          if (w > p.size * 0.5) { ctx.fillStyle = "#92400e"; ctx.font = `bold ${p.size}px system-ui`; ctx.textAlign = "center"; ctx.fillText("Rs", 0, p.size * 0.35); }
        }
      } else if (kind === "balloons") {
        ctx.rotate(Math.sin(p.rot) * 0.12);
        ctx.strokeStyle = "rgba(255,255,255,.45)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, p.size * 1.2); ctx.quadraticCurveTo(p.size * 0.3, p.size * 2.2, 0, p.size * 3.2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, 0, p.size * 0.82, p.size, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-4, p.size * 1.18); ctx.lineTo(4, p.size * 1.18); ctx.lineTo(0, p.size * 0.95); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.beginPath(); ctx.ellipse(-p.size * 0.32, -p.size * 0.4, p.size * 0.16, p.size * 0.3, -0.5, 0, Math.PI * 2); ctx.fill();
      } else if (kind === "hearts") {
        ctx.rotate(Math.sin(p.rot) * 0.35); ctx.shadowColor = p.color; ctx.shadowBlur = 10; heart(ctx, p.size);
      } else if (kind === "confetti") {
        ctx.rotate(p.rot); ctx.scale(1, Math.cos(p.rot * 2));
        if (p.kind === 0) ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        else if (p.kind === 1) { ctx.beginPath(); ctx.arc(0, 0, p.size / 2.6, 0, Math.PI * 2); ctx.fill(); }
        else heart(ctx, p.size * 0.6);
      } else {
        ctx.rotate(p.rot); ctx.shadowColor = p.color; ctx.shadowBlur = 12; star(ctx, p.size);
      }
      ctx.restore();
    }
    if (elapsed < durationMs || ps.length) raf = requestAnimationFrame(frame);
    else { window.removeEventListener("resize", resize); canvas.remove(); }
    if (elapsed > durationMs + 4000) { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); canvas.remove(); }
  };
  raf = requestAnimationFrame(frame);
}

const SEEN_KEY = "celebrated:v1";
function seen(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")); } catch { return new Set(); }
}
function markSeen(ids: string[]) {
  try { const s = seen(); ids.forEach((i) => s.add(i)); localStorage.setItem(SEEN_KEY, JSON.stringify([...s].slice(-500))); } catch { /* private mode: it just plays again next time */ }
}

const STYLE: Record<CelebrationKind, { emoji: string; bg: string; ring: string }> = {
  fireworks: { emoji: "🎆", bg: "linear-gradient(135deg, rgba(139,92,246,.95), rgba(236,72,153,.92))", ring: "#f472b6" },
  coins: { emoji: "💰", bg: "linear-gradient(135deg, rgba(234,179,8,.95), rgba(244,114,182,.9))", ring: "#fde047" },
  balloons: { emoji: "🎈", bg: "linear-gradient(135deg, rgba(244,114,182,.95), rgba(167,139,250,.92))", ring: "#f9a8d4" },
  hearts: { emoji: "💖", bg: "linear-gradient(135deg, rgba(236,72,153,.95), rgba(232,121,249,.9))", ring: "#f9a8d4" },
  confetti: { emoji: "🎉", bg: "linear-gradient(135deg, rgba(34,211,238,.92), rgba(236,72,153,.92))", ring: "#22d3ee" },
  stars: { emoji: "🌟", bg: "linear-gradient(135deg, rgba(99,102,241,.95), rgba(236,72,153,.9))", ring: "#fde68a" },
};

/**
 * Drop this anywhere on a page. It plays the animation and shows a cute pop-up
 * for achievements this device hasn't celebrated yet, then remembers them
 * so a page refresh doesn't replay it. The 🎉 chip lets you replay it on demand.
 */
export function Celebration({ kind, title, items }: { kind: CelebrationKind; title: string; items: Achievement[] }) {
  const [fresh, setFresh] = useState<Achievement[]>([]);
  const [open, setOpen] = useState(false);
  const ids = items.map((i) => i.id).join("|");

  useEffect(() => {
    if (!items.length) return;
    const s = seen();
    const unseen = items.filter((i) => !s.has(i.id));
    if (!unseen.length) return;
    setFresh(unseen);
    setOpen(true);
    markSeen(unseen.map((i) => i.id));
    const t = setTimeout(() => playCelebration(kind), 350);
    const close = setTimeout(() => setOpen(false), 12000);
    return () => { clearTimeout(t); clearTimeout(close); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, kind]);

  if (!items.length) return null;
  const st = STYLE[kind];
  const shown = open ? fresh : items;
  return (
    <>
      {!open && (
        <button type="button" onClick={() => { setOpen(true); setFresh(items); playCelebration(kind); }}
          className="fixed bottom-4 left-4 z-[80] chip text-sm px-3 py-1.5 shadow-lg" style={{ background: st.bg, color: "white" }}
          title="Replay the celebration">
          {st.emoji} {items.length} win{items.length === 1 ? "" : "s"} · replay
        </button>
      )}
      {open && (
        <div role="status" aria-live="polite" data-celebration="" className="fixed z-[95] left-1/2 -translate-x-1/2 top-20 w-[min(92vw,30rem)] rounded-3xl p-5 text-white rise"
          style={{ background: st.bg, boxShadow: `0 0 0 2px ${st.ring}, 0 18px 50px rgba(0,0,0,.45), 0 0 40px ${st.ring}66` }}>
          <div className="flex items-start gap-3">
            <div className="text-4xl leading-none celebrate-bob">{st.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{title}</div>
              <ul className="mt-2 space-y-1.5 text-[0.95rem] leading-snug">
                {shown.slice(0, 4).map((i) => <li key={i.id}>{i.text}</li>)}
                {shown.length > 4 && <li className="opacity-80">…and {shown.length - 4} more 💅</li>}
              </ul>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-white/80 hover:text-white text-xl leading-none">×</button>
          </div>
        </div>
      )}
    </>
  );
}
