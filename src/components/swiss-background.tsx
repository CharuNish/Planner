"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SCENES, SNOWY, Snowfall, W, H, type SceneKey } from "./swiss/scenes";

/** Which Swiss scene each tab shows. The Content tab keeps its own pink look (it draws its own background). */
export function sceneFor(path: string): SceneKey {
  if (path === "/") return "matterhorn";
  if (path.startsWith("/login")) return "matterhorn-night";
  if (path.startsWith("/finance")) return "zurich";
  if (path.startsWith("/calendar")) return "glacier-express";
  if (path.startsWith("/studies")) return "lucerne";
  if (path.startsWith("/updates") || path.startsWith("/opportunities")) return "jungfrau";
  if (path.startsWith("/weight") || path.startsWith("/health")) return "meadow";
  if (path.startsWith("/habits")) return "village";
  if (path.startsWith("/goals")) return "lauterbrunnen";
  if (path.startsWith("/wins")) return "geneva";
  return "matterhorn";
}

/**
 * Animated Switzerland background. Layers slide at different depths as the cursor moves
 * (on phones they sway gently by themselves), and a soft light follows the cursor.
 * Pauses when the tab is hidden; holds still for "reduce motion".
 */
export function SwissBackground({ scene: forced }: { scene?: SceneKey }) {
  const path = usePathname();
  const scene = forced ?? sceneFor(path);
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const touch = window.matchMedia("(hover: none)").matches;
    let tx = 0, ty = 0, x = 0, y = 0, lx = 50, ly = 30, tlx = 50, tly = 30, raf = 0, running = !document.hidden;
    const t0 = performance.now();
    const onMove = (e: PointerEvent) => {
      tx = e.clientX / window.innerWidth - 0.5; ty = e.clientY / window.innerHeight - 0.5;
      tlx = (e.clientX / window.innerWidth) * 100; tly = (e.clientY / window.innerHeight) * 100;
    };
    const tick = () => {
      if (!running) return;
      if (touch) { const t = (performance.now() - t0) / 1000; tx = Math.sin(t * 0.25) * 0.35; ty = Math.cos(t * 0.18) * 0.2; tlx = 50 + tx * 60; tly = 30 + ty * 40; }
      x += (tx - x) * 0.06; y += (ty - y) * 0.06; lx += (tlx - lx) * 0.08; ly += (tly - ly) * 0.08;
      el.style.setProperty("--mx", x.toFixed(4)); el.style.setProperty("--my", y.toFixed(4));
      el.style.setProperty("--lx", `${lx.toFixed(2)}%`); el.style.setProperty("--ly", `${ly.toFixed(2)}%`);
      raf = requestAnimationFrame(tick);
    };
    const onVis = () => { running = !document.hidden; cancelAnimationFrame(raf); if (running && !reduce) tick(); };
    if (!reduce) { window.addEventListener("pointermove", onMove, { passive: true }); tick(); }
    document.addEventListener("visibilitychange", onVis);
    return () => { running = false; cancelAnimationFrame(raf); window.removeEventListener("pointermove", onMove); document.removeEventListener("visibilitychange", onVis); };
  }, [mounted]);

  if (path.startsWith("/content") && !forced) return null;
  const Scene = SCENES[scene];
  return (
    <div ref={ref} aria-hidden className="swiss-bg" data-scene={scene}>
      {mounted && (
        <svg key={scene} className="swiss-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
          <Scene />
        </svg>
      )}
      {mounted && SNOWY[scene] ? <Snowfall strength={SNOWY[scene]} /> : null}
      <div className="swiss-light" />
      <div className="swiss-scrim" />
    </div>
  );
}
