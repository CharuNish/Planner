"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Confetti cannons when you hit your step goal, plus a golden star shower when you walk way more than usual.
 * (Fireworks belong to Studies, so each tab celebrates differently.)
 * Plays once per day per achievement (remembered in this browser); tap "again" to replay.
 */
export function StepParty({ id, title, sub, big = false }: { id: string; title: string; sub: string; big?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [run, setRun] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(`party:${id}`) === "1"; localStorage.setItem(`party:${id}`, "1"); } catch { /* private mode: just play */ }
    if (!seen) setRun(1);
  }, [id]);

  useEffect(() => {
    if (!run) return;
    const c = canvas.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    setShow(true);
    const dpr = window.devicePixelRatio || 1;
    const resize = () => { c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize(); addEventListener("resize", resize);
    // Confetti cannons from both bottom corners; a big day adds a shower of golden stars.
    const colors = ["#f472b6", "#a78bfa", "#22d3ee", "#fde047", "#34d399", "#fb7185"];
    type P = { x: number; y: number; vx: number; vy: number; rot: number; spin: number; w: number; h: number; color: string; star?: boolean; life: number };
    const ps: P[] = [];
    const W = () => innerWidth, H = () => innerHeight;
    const cannon = (left: boolean, n: number) => {
      for (let i = 0; i < n; i++) {
        const ang = (left ? -1 : -1) * (Math.PI / 2) + (left ? 1 : -1) * (0.25 + Math.random() * 0.5);
        const sp = 9 + Math.random() * 9;
        ps.push({ x: left ? 0 : W(), y: H(), vx: Math.cos(ang) * sp * (left ? 1 : 1), vy: Math.sin(ang) * sp, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 0.4, w: 6 + Math.random() * 6, h: 3 + Math.random() * 4, color: colors[i % colors.length], life: 260 });
      }
    };
    const timers: ReturnType<typeof setTimeout>[] = [];
    const volleys = big ? 4 : 2;
    for (let v = 0; v < volleys; v++) timers.push(setTimeout(() => { cannon(true, big ? 90 : 70); cannon(false, big ? 90 : 70); }, v * 700));
    if (big) for (let i = 0; i < 70; i++) timers.push(setTimeout(() => ps.push({ x: Math.random() * W(), y: -20, vx: (Math.random() - 0.5) * 0.6, vy: 2 + Math.random() * 2.5, rot: 0, spin: (Math.random() - 0.5) * 0.08, w: 7 + Math.random() * 8, h: 0, color: Math.random() < 0.7 ? "#fde68a" : "#ffffff", star: true, life: 400 }), 300 + i * 70));
    const starPath = (r: number) => { ctx.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.42 : r, an = (Math.PI / 5) * i - Math.PI / 2; ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); } ctx.closePath(); ctx.fill(); };
    let raf = 0; const start = performance.now();
    const tick = (t: number) => {
      ctx.clearRect(0, 0, W(), H());
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        if (p.star) { p.x += p.vx + Math.sin((t + i * 90) / 400) * 0.4; p.y += p.vy; }
        else { p.vy += 0.22; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx + Math.sin((t + i * 50) / 300) * 0.6; p.y += p.vy; }
        p.rot += p.spin; p.life--;
        if (p.life <= 0 || p.y > H() + 40) { ps.splice(i, 1); continue; }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.globalAlpha = Math.min(1, p.life / 60);
        if (p.star) { ctx.shadowColor = "#fde68a"; ctx.shadowBlur = 12; starPath(p.w); }
        else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2)) + 1);
        ctx.restore();
      }
      if (t - start < (big ? 7500 : 5000) || ps.length) raf = requestAnimationFrame(tick);
      else { ctx.clearRect(0, 0, W(), H()); setShow(false); }
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); timers.forEach(clearTimeout); removeEventListener("resize", resize); };
  }, [run, big]);

  return (
    <>
      <canvas ref={canvas} className="fixed inset-0 pointer-events-none z-50" style={{ width: "100vw", height: "100vh", display: show ? "block" : "none" }} aria-hidden />
      <div className="rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap" style={{ background: "linear-gradient(90deg, rgba(244,114,182,.18), rgba(251,191,36,.16), rgba(34,211,238,.16))", border: "1px solid rgba(251,191,36,.35)" }}>
        <div>
          <div className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>{title}</div>
          <div className="text-sm muted">{sub}</div>
        </div>
        <button type="button" onClick={() => setRun((r) => r + 1)} className="chip">🎊 again!</button>
      </div>
    </>
  );
}
