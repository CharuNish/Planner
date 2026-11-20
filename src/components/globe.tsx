"use client";
import createGlobe from "cobe";
import { useEffect, useRef } from "react";

/** Slowly spinning 3D globe with a glowing pin for each place you want to visit. Drag to spin it. */
export function TravelGlobe({ markers }: { markers: { coords: [number, number]; label: string }[] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; phi: number } | null>(null);
  useEffect(() => {
    if (!canvas.current) return;
    let phi = 0.9, width = canvas.current.offsetWidth;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onResize = () => { if (canvas.current) width = canvas.current.offsetWidth; };
    window.addEventListener("resize", onResize);
    const globe = createGlobe(canvas.current, {
      devicePixelRatio: 2, width: width * 2, height: width * 2,
      phi, theta: 0.25, dark: 1, diffuse: 1.2, mapSamples: 16000, mapBrightness: 6, opacity: 0.95,
      baseColor: [0.32, 0.27, 0.6], markerColor: [0.13, 0.83, 0.93], glowColor: [0.45, 0.3, 0.95],
      markers: markers.map((m) => ({ location: m.coords, size: 0.07 })),
      onRender: (state) => {
        if (!drag.current && !reduce) phi += 0.003;
        state.phi = drag.current ? drag.current.phi : phi;
        state.width = width * 2; state.height = width * 2;
      },
    });
    const el = canvas.current;
    const down = (e: PointerEvent) => { drag.current = { x: e.clientX, phi }; el.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => { if (drag.current) { drag.current.phi = phi + (e.clientX - drag.current.x) / 150; } };
    const up = () => { if (drag.current) phi = drag.current.phi; drag.current = null; };
    el.addEventListener("pointerdown", down); el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    requestAnimationFrame(() => { if (canvas.current) canvas.current.style.opacity = "1"; });
    return () => { globe.destroy(); window.removeEventListener("resize", onResize); el.removeEventListener("pointerdown", down); el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); };
  }, [markers]);
  return <canvas ref={canvas} className="w-full aspect-square cursor-grab active:cursor-grabbing" style={{ opacity: 0, transition: "opacity 1s", touchAction: "pan-y" }} aria-label="Globe showing places you want to visit" />;
}
