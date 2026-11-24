"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { Env, Mouse, SceneMaker } from "./whimsy/engine";
import { chimes, fireflies, koi, lanterns } from "./whimsy/scenes-a";
import { jellyfish, planes, sakura, stars } from "./whimsy/scenes-b";
import { garden } from "./whimsy/garden";

/** Which interactive background each tab gets. The Content tab keeps its own pink look. */
const SCENES: { match: (p: string) => boolean; scene: SceneMaker }[] = [
  { match: (p) => p.startsWith("/finance"), scene: koi },
  { match: (p) => p.startsWith("/calendar"), scene: sakura },
  { match: (p) => p.startsWith("/studies"), scene: chimes },
  { match: (p) => p.startsWith("/updates") || p.startsWith("/opportunities"), scene: jellyfish },
  { match: (p) => p.startsWith("/weight") || p.startsWith("/health"), scene: garden },
  { match: (p) => p.startsWith("/habits"), scene: fireflies },
  { match: (p) => p.startsWith("/goals"), scene: planes },
  { match: (p) => p.startsWith("/wins"), scene: stars },
];
const sceneFor = (path: string) => SCENES.find((s) => s.match(path))?.scene ?? lanterns;

/** Clicks on these are the page's own; only clicks on empty background reach the scene. */
const INTERACTIVE = "a, button, input, select, textarea, label, summary, [role=button], .card, header, nav, form";

/**
 * Whimsical background drawn on a canvas behind the page. Things in it react to the cursor
 * (or your finger), and a click or tap on empty space does something special in each scene.
 * Pauses when the tab is hidden; draws one still frame for "reduce motion".
 */
export function WhimsyBackground() {
  const path = usePathname();
  const ref = useRef<HTMLCanvasElement>(null);
  const hidden = path.startsWith("/content");
  const maker = sceneFor(path);

  useEffect(() => {
    const cv = ref.current;
    if (!cv || hidden) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mouse: Mouse = { x: -999, y: -999, px: -999, py: -999, active: false };
    const env: Env = { ctx, W: 0, H: 0, mouse, small: false };
    const scene = maker(env);
    let raf = 0, last = performance.now(), running = !document.hidden;
    const t0 = last;

    const size = () => {
      env.small = window.innerWidth < 768;
      const dpr = Math.min(window.devicePixelRatio || 1, env.small ? 1.5 : 2);
      env.W = window.innerWidth; env.H = window.innerHeight;
      cv.width = Math.round(env.W * dpr); cv.height = Math.round(env.H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scene.init();
    };
    const move = (e: PointerEvent) => { mouse.px = mouse.x; mouse.py = mouse.y; mouse.x = e.clientX; mouse.y = e.clientY; if (!mouse.active) { mouse.px = mouse.x; mouse.py = mouse.y; } mouse.active = true; };
    const leave = () => { mouse.active = false; };
    const down = (e: PointerEvent) => {
      const el = e.target as Element | null;
      if (el?.closest?.(INTERACTIVE)) return;
      scene.click?.(e.clientX, e.clientY);
    };
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      scene.frame((now - t0) / 1000, reduce ? 0 : dt);
      mouse.px = mouse.x; mouse.py = mouse.y;
      if (running && !reduce) raf = requestAnimationFrame(frame);
    };
    const vis = () => {
      running = !document.hidden;
      cancelAnimationFrame(raf);
      if (running) { last = performance.now(); raf = requestAnimationFrame(frame); }
    };
    let resizeTimer = 0;
    const onResize = () => { clearTimeout(resizeTimer); resizeTimer = window.setTimeout(() => { size(); if (reduce) frame(performance.now()); }, 150); };

    size();
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    window.addEventListener("pointerdown", down);
    document.addEventListener("visibilitychange", vis);
    raf = requestAnimationFrame(frame);
    return () => {
      running = false; cancelAnimationFrame(raf); clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
      window.removeEventListener("pointerdown", down);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [maker, hidden]);

  if (hidden) return null;
  return (
    <div aria-hidden className="whimsy-bg">
      <canvas ref={ref} />
      <div className="whimsy-scrim" />
    </div>
  );
}
