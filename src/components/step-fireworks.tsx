"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Fireworks over the page when you hit your step goal (or walk way more than usual).
 * Plays once per day per achievement (remembered in this browser); tap "again" to replay.
 */
export function StepFireworks({ id, title, sub, big = false }: { id: string; title: string; sub: string; big?: boolean }) {
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
    const colors = ["#f472b6", "#a78bfa", "#22d3ee", "#fbbf24", "#34d399", "#fb7185"];
    type P = { x: number; y: number; vx: number; vy: number; life: number; color: string; rocket?: boolean; tx?: number; ty?: number };
    const ps: P[] = [];
    const rockets = big ? 9 : 5;
    const launch = (i: number) => setTimeout(() => {
      const x = innerWidth * (0.15 + Math.random() * 0.7), ty = innerHeight * (0.15 + Math.random() * 0.3);
      ps.push({ x, y: innerHeight, vx: (Math.random() - 0.5) * 1.5, vy: -(innerHeight - ty) / 38, life: 38, color: colors[i % colors.length], rocket: true, tx: x, ty });
    }, i * (big ? 260 : 380));
    const timers = Array.from({ length: rockets }, (_, i) => launch(i));
    let raf = 0; const start = performance.now();
    const tick = (t: number) => {
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.fillRect(0, 0, innerWidth, innerHeight);
      ctx.globalCompositeOperation = "lighter";
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.x += p.vx; p.y += p.vy; p.life--;
        if (p.rocket) {
          if (p.life <= 0) { // burst
            const n = big ? 90 : 60;
            for (let j = 0; j < n; j++) { const a = (j / n) * Math.PI * 2, sp = 2 + Math.random() * (big ? 5 : 3.6); ps.push({ x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 50 + Math.random() * 30, color: Math.random() < 0.25 ? "#fff" : p.color }); }
            ps.splice(i, 1); continue;
          }
        } else { p.vy += 0.05; p.vx *= 0.985; p.vy *= 0.985; }
        if (p.life <= 0) { ps.splice(i, 1); continue; }
        ctx.globalAlpha = p.rocket ? 1 : Math.min(1, p.life / 40);
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.rocket ? 2.4 : 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (t - start < (big ? 6500 : 4800) || ps.length) raf = requestAnimationFrame(tick);
      else { ctx.clearRect(0, 0, innerWidth, innerHeight); setShow(false); }
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
        <button type="button" onClick={() => setRun((r) => r + 1)} className="chip">🎆 again!</button>
      </div>
    </>
  );
}
