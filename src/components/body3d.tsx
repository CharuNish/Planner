"use client";
import { useEffect, useRef, useState } from "react";
import type { MeasureEntry } from "@/lib/life";

/**
 * A 3D figure built from your measurements, in centimetres, at your height.
 * Each body part is a soft rounded shape sized from your tape measure (circumference → oval), blended
 * together like clay. Belly / bust / bum sit at the front or back, so a side view shows a bigger belly properly.
 * Drag to spin. "Day 1" can be shown as a see-through ghost around "Now".
 */

// Semi-axes of an oval with circumference C and width/depth ratio r (Ramanujan's formula).
function oval(C: number, r: number) {
  const f = (a: number) => { const b = a / r; const h = ((a - b) / (a + b)) ** 2; return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h))); };
  let lo = 0, hi = C;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (f(mid) < C) lo = mid; else hi = mid; }
  return { a: lo, b: lo / r };
}

type V = [number, number, number];
// Signed-distance shapes (cm). Negative = inside. Smoothly blended like clay, so no sharp points.
const ellipsoid = (p: V, c: V, r: V) => {
  const x = (p[0] - c[0]) / r[0], y = (p[1] - c[1]) / r[1], z = (p[2] - c[2]) / r[2];
  const k0 = Math.sqrt(x * x + y * y + z * z);
  const x1 = x / r[0], y1 = y / r[1], z1 = z / r[2];
  const k1 = Math.sqrt(x1 * x1 + y1 * y1 + z1 * z1) || 1e-6;
  return (k0 * (k0 - 1)) / k1;
};
/** Tapered limb between two points with radii r1, r2. */
const limb = (p: V, a: V, b: V, r1: number, r2: number) => {
  const ba: V = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], pa: V = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const L2 = ba[0] ** 2 + ba[1] ** 2 + ba[2] ** 2;
  const h = Math.max(0, Math.min(1, (pa[0] * ba[0] + pa[1] * ba[1] + pa[2] * ba[2]) / L2));
  const d = Math.hypot(pa[0] - ba[0] * h, pa[1] - ba[1] * h, pa[2] - ba[2] * h);
  return d - (r1 + (r2 - r1) * h);
};
const smin = (a: number, b: number, k: number) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - (h * h * k) / 4; };

/** Builds the body's distance function from the measurements (cm, y up, z = front). */
export function bodySDF(e: MeasureEntry, H: number) {
  const at = (f: number) => f * H;
  const chest = oval(e.chest, 1.35), waist = oval(e.waist, 1.3), hip = oval(e.hip, 1.42);
  const bellyRound = Math.max(1.05, 1.32 - Math.max(0, e.belly / e.hip - 0.82) * 1.5); // bigger belly = rounder
  const belly = oval(e.belly, bellyRound);
  const underC = Math.min(e.chest * 0.88, (e.chest + e.waist) / 2);
  const under = oval(underC, 1.32);
  const bustR = Math.max(3.5, Math.min(9, (e.chest - underC) * 0.42 + 2.5)); // breast size from chest vs underbust
  const shoulder = Math.max(chest.a * 1.12, 17);
  const thigh = oval(e.thigh, 1.08);
  const legX = Math.max(hip.a - thigh.a * 1.02, thigh.a * 0.85);
  const arm = oval(e.arms, 1.05);
  const tummyZ = Math.max(0, belly.b - waist.b) * 0.55; // belly sits further forward
  const vy = H * 0.06;
  const armX = Math.max(shoulder - arm.a * 0.6, chest.a + arm.a + 0.5);
  const elbowX = Math.max(armX + 1, waist.a + arm.a * 0.8 + 1.5, belly.a * 0.92 + arm.a * 0.8 + 1);
  const wristX = Math.max(elbowX - 1, hip.a * 0.98 + 3.2, belly.a * 0.9 + 3.5);

  return (p: V) => {
    const x = Math.abs(p[0]); // the body is symmetric
    const q: V = [x, p[1], p[2]];
    // Torso: pelvis, belly, waist, ribs, chest and shoulders blended together.
    let t = ellipsoid(q, [0, at(0.495), -0.5], [hip.a, vy * 1.7, hip.b]);
    t = smin(t, ellipsoid(q, [0, at(0.575), tummyZ * 0.6], [belly.a * 0.97, vy, belly.b]), 7);
    t = smin(t, ellipsoid(q, [0, at(0.625), 0], [waist.a, vy * 0.9, waist.b]), 7);
    t = smin(t, ellipsoid(q, [0, at(0.685), 0], [under.a, vy * 1.1, under.b]), 7);
    t = smin(t, ellipsoid(q, [0, at(0.76), -1], [shoulder * 0.84, vy * 0.95, chest.b * 0.78]), 8);
    t = smin(t, ellipsoid(q, [shoulder * 0.6, at(0.785), -1.5], [shoulder * 0.4, vy * 0.5, chest.b * 0.5]), 8);
    // Bust and bum.
    t = smin(t, ellipsoid(q, [chest.a * 0.44, at(0.72), under.b * 0.55], [bustR * 1.08, bustR * 0.98, bustR * 0.9]), 3.5);
    t = smin(t, ellipsoid(q, [hip.a * 0.4, at(0.485), -hip.b * 0.3], [hip.a * 0.46, vy * 1.0, hip.b * 0.55]), 6);
    // Neck and head.
    t = smin(t, limb(q, [0, at(0.8), -1], [0, at(0.88), 0], 6.6, 5.8), 4);
    t = smin(t, ellipsoid(q, [0, at(0.935), 0.5], [H * 0.052, H * 0.066, H * 0.06]), 2.5);
    // Legs: thigh → knee → calf → ankle, and a foot.
    let l = limb(q, [legX, at(0.5), 0], [legX * 0.62, at(0.285), 0.5], thigh.a, Math.max(5.2, thigh.a * 0.56));
    l = smin(l, limb(q, [legX * 0.62, at(0.285), 0.5], [legX * 0.56, at(0.05), -0.5], Math.max(5, thigh.a * 0.54), 3.3), 2);
    l = smin(l, ellipsoid(q, [legX * 0.6, at(0.2), -1.2], [Math.max(5.2, thigh.a * 0.6), H * 0.06, Math.max(5.5, thigh.b * 0.66)]), 3);
    l = smin(l, ellipsoid(q, [legX * 0.56, at(0.018), 4.5], [4.2, 3, 11]), 2.5);
    t = smin(t, l, 4);
    // Arms hang beside the body (kept separate so they don't web onto the waist).
    let a = limb(q, [armX, at(0.78), -1.5], [elbowX, at(0.62), -1], arm.a * 1.05, arm.a * 0.74);
    a = smin(a, limb(q, [elbowX, at(0.625), -1], [wristX, at(0.47), 0.5], arm.a * 0.72, 2.6), 2);
    a = smin(a, ellipsoid(q, [wristX + 0.3, at(0.435), 1], [2.2, 8.5, 4.2]), 2);
    a = smin(a, ellipsoid(q, [shoulder * 0.8, at(0.776), -1.5], [arm.a * 1.15, arm.a * 1.25, arm.a * 1.1]), 3);
    return smin(t, a, 1.2);
  };
}

export function Body3D({ entries, heightCm }: { entries: MeasureEntry[]; heightCm: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const viewRef = useRef<(v: "front" | "side" | "back") => void>(() => {});
  const [ghost, setGhost] = useState(true);
  const ghostRef = useRef<(on: boolean) => void>(() => {});
  const both = entries.length > 1;

  useEffect(() => {
    let cleanup = () => {};
    let cancelled = false;
    (async () => {
      const THREE = await import("three");
      const el = ref.current;
      if (!el || cancelled) return;
      const H = heightCm > 120 && heightCm < 220 ? heightCm : 160;
      const w = el.clientWidth, h = el.clientHeight;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
      el.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, w / h, 1, 2000);
      camera.position.set(0, H * 0.52, H * 2.35);
      camera.lookAt(0, H * 0.5, 0);

      scene.add(new THREE.HemisphereLight(0xc4b5fd, 0x0b1020, 1.1));
      const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(80, 200, 160); scene.add(key);
      const rim = new THREE.DirectionalLight(0x22d3ee, 1.4); rim.position.set(-160, 120, -140); scene.add(rim);
      const pink = new THREE.PointLight(0xec4899, 2.2, 0, 0); pink.position.set(120, 60, -60); scene.add(pink);

      const { MarchingCubes } = await import("three/examples/jsm/objects/MarchingCubes.js");
      const RES = window.innerWidth < 768 ? 84 : 104;
      const S = H * 0.53; // the marching-cubes box spans -1..1, i.e. ±S cm
      // Samples the body's distance function on a grid and turns it into a smooth surface.
      const build = (e: MeasureEntry, mat: InstanceType<typeof THREE.Material>) => {
        const sdf = bodySDF(e, H);
        const mc = new MarchingCubes(RES, mat, false, false, 160000);
        mc.reset(); mc.isolation = 0;
        const half = RES / 2;
        for (let z = 0; z < RES; z++) for (let y = 0; y < RES; y++) for (let x = 0; x < RES; x++) {
          const p: V = [((x - half) / half) * S, ((y - half) / half) * S + H / 2, ((z - half) / half) * S];
          // Skip far-away space quickly (the body is narrow).
          mc.field[x + y * RES + z * RES * RES] = Math.abs(p[0]) > 60 || Math.abs(p[2]) > 45 ? -20 : -sdf(p);
        }
        mc.update();
        mc.scale.set(S, S, S); mc.position.set(0, H / 2, 0);
        return mc;
      };

      const skin = new THREE.MeshPhysicalMaterial({ color: 0xc9b8ff, roughness: 0.55, metalness: 0, sheen: 0.8, sheenColor: new THREE.Color(0x67e8f9), sheenRoughness: 0.6 });
      const root = new THREE.Group(); scene.add(root);
      root.add(build(entries[entries.length - 1], skin));
      let ghostGroup: InstanceType<typeof THREE.Object3D> | null = null;
      if (entries.length > 1) {
        const gm = new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.1, depthWrite: false });
        ghostGroup = build(entries[0], gm); root.add(ghostGroup);
      }
      ghostRef.current = (on) => { if (ghostGroup) ghostGroup.visible = on; };
      // Floor glow
      const ring = new THREE.Mesh(new THREE.RingGeometry(H * 0.12, H * 0.2, 64), new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; scene.add(ring);

      // Drag to spin, gentle auto-spin otherwise.
      let target = 0.5, angle = 0.5, dragging = false, lastX = 0, idle = 0;
      const down = (ev: PointerEvent) => { dragging = true; lastX = ev.clientX; el.setPointerCapture(ev.pointerId); };
      const move = (ev: PointerEvent) => { if (!dragging) return; target += (ev.clientX - lastX) * 0.012; lastX = ev.clientX; idle = 0; };
      const up = () => { dragging = false; };
      el.addEventListener("pointerdown", down); el.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
      viewRef.current = (v) => { const base = Math.round(target / (Math.PI * 2)) * Math.PI * 2; target = base + (v === "front" ? 0 : v === "side" ? Math.PI / 2 : Math.PI); idle = -400; };
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let raf = 0;
      const loop = () => {
        idle++;
        if (!dragging && idle > 240 && !reduce) target += 0.004;
        angle += (target - angle) * 0.12;
        root.rotation.y = angle;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(loop);
      };
      loop();
      const onResize = () => { const W = el.clientWidth, HH = el.clientHeight; renderer.setSize(W, HH); camera.aspect = W / HH; camera.updateProjectionMatrix(); };
      window.addEventListener("resize", onResize);
      cleanup = () => {
        cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); window.removeEventListener("pointerup", up);
        el.removeEventListener("pointerdown", down); el.removeEventListener("pointermove", move);
        renderer.dispose(); el.innerHTML = "";
      };
    })();
    return () => { cancelled = true; cleanup(); };
  }, [entries, heightCm]);

  return (
    <div>
      <div ref={ref} className="w-full mx-auto cursor-grab active:cursor-grabbing touch-pan-y" style={{ height: "min(55vh, 460px)" }} aria-label="3D figure from your measurements. Drag to spin." role="img" />
      <div className="flex flex-wrap justify-center items-center gap-2 mt-2 text-xs">
        {(["front", "side", "back"] as const).map((v) => <button key={v} type="button" onClick={() => viewRef.current(v)} className="rounded-lg border px-3 py-1.5 capitalize">{v}</button>)}
        {both && <label className="flex items-center gap-1.5 ml-2 muted cursor-pointer"><input type="checkbox" checked={ghost} onChange={(e) => { setGhost(e.target.checked); ghostRef.current(e.target.checked); }} className="accent-[var(--accent)]" /> Show Day 1 ghost</label>}
      </div>
      <p className="text-xs muted text-center mt-1">Drag to spin. {both ? "The see-through pink shape is you on Day 1; the solid figure is you now." : "Add more check-ins to see Day 1 as a ghost around you."}</p>
    </div>
  );
}
