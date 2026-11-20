"use client";
import { useEffect, useRef, useState } from "react";
import type { MeasureEntry } from "@/lib/life";

/**
 * A 3D figure built from your measurements, in centimetres, at your height.
 * Every body part is a stack of oval slices: its circumference comes from your tape measure, and
 * belly / bust / bum push out to the front or back, so a side view shows a bigger belly properly.
 * Drag to spin. "Day 1" can be shown as a see-through ghost around "Now".
 */

type Ring = { y: number; x: number; z: number; a: number; b: number; front?: number; back?: number };

// Semi-axes of an oval with circumference C and width/depth ratio r (Ramanujan's formula).
function oval(C: number, r: number) {
  const f = (a: number) => { const b = a / r; const h = ((a - b) / (a + b)) ** 2; return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h))); };
  let lo = 0, hi = C;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (f(mid) < C) lo = mid; else hi = mid; }
  return { a: lo, b: lo / r };
}

/** Smoothly interpolates key slices into many slices (Catmull-Rom on every number). */
function smooth(keys: Ring[], perSeg = 8): Ring[] {
  const out: Ring[] = [];
  const kk = ["y", "x", "z", "a", "b", "front", "back"] as const;
  for (let i = 0; i < keys.length - 1; i++) {
    const p0 = keys[Math.max(0, i - 1)], p1 = keys[i], p2 = keys[i + 1], p3 = keys[Math.min(keys.length - 1, i + 2)];
    for (let s = 0; s < perSeg; s++) {
      const t = s / perSeg, t2 = t * t, t3 = t2 * t;
      const r = {} as Ring;
      for (const k of kk) {
        const v0 = p0[k] ?? 0, v1 = p1[k] ?? 0, v2 = p2[k] ?? 0, v3 = p3[k] ?? 0;
        (r as Record<string, number>)[k] = 0.5 * (2 * v1 + (-v0 + v2) * t + (2 * v0 - 5 * v1 + 4 * v2 - v3) * t2 + (-v0 + 3 * v1 - 3 * v2 + v3) * t3);
      }
      out.push(r);
    }
  }
  out.push(keys[keys.length - 1]);
  return out;
}

/** Builds the slices for torso, legs and arms (in cm, y up, z = front). */
export function bodyParts(e: MeasureEntry, H: number) {
  const at = (f: number) => f * H;
  const chest = oval(e.chest, 1.32), waist = oval(e.waist, 1.28), hip = oval(e.hip, 1.38);
  // A bigger belly (compared with the hips) gets rounder and pushes forward.
  const bellyRatio = Math.max(1.02, 1.3 - Math.max(0, e.belly / e.hip - 0.82) * 1.6);
  const belly = oval(e.belly, bellyRatio);
  const under = oval(Math.min(e.chest * 0.88, (e.chest + e.waist) / 2), 1.3);
  const neck = oval(Math.max(30, e.chest * 0.36), 1.05);
  const shoulderHalf = Math.max(chest.a * 1.18, 17);
  const bust = Math.max(0, (e.chest - Math.min(e.chest * 0.88, (e.chest + e.waist) / 2)) * 0.45); // how far the bust stands out
  const tummy = Math.max(0, belly.b - waist.b) * 0.9; // belly push to the front
  const bum = Math.max(0, hip.b * 0.16);

  const torso = smooth([
    { y: at(0.462), x: 0, z: 0, a: hip.a * 0.6, b: hip.b * 0.55 },
    { y: at(0.478), x: 0, z: 0, a: hip.a * 0.9, b: hip.b * 0.85 },
    { y: at(0.5), x: 0, z: 0, a: hip.a, b: hip.b, back: bum },
    { y: at(0.545), x: 0, z: 0, a: (hip.a + belly.a) / 2, b: (hip.b + belly.b) / 2, back: bum * 0.5, front: tummy * 0.7 },
    { y: at(0.58), x: 0, z: 0, a: belly.a, b: belly.b, front: tummy },
    { y: at(0.625), x: 0, z: 0, a: waist.a, b: waist.b, front: tummy * 0.3 },
    { y: at(0.67), x: 0, z: 0, a: under.a, b: under.b },
    { y: at(0.715), x: 0, z: 0, a: chest.a, b: chest.b * 0.92, front: bust },
    { y: at(0.76), x: 0, z: 0, a: chest.a * 1.02, b: chest.b * 0.85, front: bust * 0.3 },
    { y: at(0.795), x: 0, z: -1, a: shoulderHalf * 0.96, b: chest.b * 0.66 },
    { y: at(0.818), x: 0, z: -1, a: shoulderHalf * 0.62, b: chest.b * 0.52 },
    { y: at(0.84), x: 0, z: -0.5, a: neck.a * 1.15, b: neck.b * 1.1 },
    { y: at(0.87), x: 0, z: 0, a: neck.a, b: neck.b },
  ], 7);

  const thigh = oval(e.thigh, 1.08);
  const legX = Math.max(hip.a - thigh.a * 1.0, thigh.a * 0.82); // thighs may touch, like real ones
  const legKeys = (s: 1 | -1): Ring[] => [
    { y: at(0.54), x: s * legX * 0.8, z: 0, a: thigh.a * 0.95, b: thigh.b },
    { y: at(0.49), x: s * legX * 0.9, z: 0, a: thigh.a * 1.04, b: thigh.b * 1.08 },
    { y: at(0.43), x: s * legX * 0.92, z: 0, a: thigh.a, b: thigh.b },
    { y: at(0.36), x: s * legX * 0.8, z: 0.3, a: thigh.a * 0.82, b: thigh.b * 0.82 },
    { y: at(0.285), x: s * legX * 0.62, z: 0.6, a: Math.max(5.2, thigh.a * 0.6), b: Math.max(5, thigh.b * 0.6) },
    { y: at(0.2), x: s * legX * 0.6, z: -0.6, a: Math.max(5.3, thigh.a * 0.62), b: Math.max(5.6, thigh.b * 0.68) },
    { y: at(0.08), x: s * legX * 0.55, z: 0, a: 3.6, b: 3.6 },
    { y: at(0.04), x: s * legX * 0.55, z: 0, a: 3.3, b: 3.4 },
  ];
  const arm = oval(e.arms, 1.0);
  const armTop = shoulderHalf - arm.a * 0.5;
  const armKeys = (s: 1 | -1): Ring[] => {
    const clear = (y: number, need: number) => Math.max(armTop, need + arm.a + 1.5) + (y < at(0.66) ? 1 : 0);
    return [
      { y: at(0.8), x: s * armTop, z: -1, a: arm.a * 1.15, b: arm.b * 1.2 },
      { y: at(0.72), x: s * clear(at(0.72), chest.a), z: -1, a: arm.a, b: arm.b },
      { y: at(0.63), x: s * clear(at(0.63), Math.max(waist.a, belly.a * 0.95)), z: -0.5, a: arm.a * 0.78, b: arm.b * 0.78 },
      { y: at(0.53), x: s * (clear(at(0.53), Math.max(belly.a * 0.9, hip.a * 0.95)) + 1), z: 0.5, a: arm.a * 0.6, b: arm.b * 0.62 },
      { y: at(0.46), x: s * (clear(at(0.46), hip.a * 0.97) + 1.5), z: 1, a: arm.a * 0.4, b: arm.b * 0.3 },
    ];
  };
  return {
    torso, legs: [smooth(legKeys(1), 6), smooth(legKeys(-1), 6)], arms: [smooth(armKeys(1), 6), smooth(armKeys(-1), 6)],
    head: { y: at(0.93), r: H * 0.062 },
    hands: armKeys(1).slice(-1).concat(armKeys(-1).slice(-1)).map((r) => ({ x: r.x, y: r.y - 6, z: r.z })),
    feet: [1, -1].map((s) => ({ x: s * legX * 0.55, y: at(0.015), z: 4 })),
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

      const N = 40;
      const tube = (rings: Ring[]) => {
        const pos: number[] = [], idx: number[] = [];
        for (const r of rings) for (let j = 0; j < N; j++) {
          const t = (j / N) * Math.PI * 2;
          const sx = Math.sin(t), cz = Math.cos(t); // z+ is the front
          let z = r.b * cz;
          if (cz > 0 && r.front) z += r.front * cz ** 3 * (r.y > H * 0.69 ? Math.max(0, 1 - Math.abs(Math.abs(sx) - 0.45) * 2.2) : 1);
          if (cz < 0 && r.back) z -= r.back * (-cz) ** 2.5;
          pos.push(r.x + r.a * sx, r.y, r.z + z);
        }
        for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < N; j++) {
          const a = i * N + j, b = i * N + ((j + 1) % N), c = (i + 1) * N + j, d = (i + 1) * N + ((j + 1) % N);
          idx.push(a, c, b, b, c, d);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        g.setIndex(idx); g.computeVertexNormals();
        return g;
      };
      const build = (e: MeasureEntry, mat: InstanceType<typeof THREE.Material>) => {
        const p = bodyParts(e, H);
        const grp = new THREE.Group();
        for (const rings of [p.torso, ...p.legs, ...p.arms]) grp.add(new THREE.Mesh(tube(rings), mat));
        const head = new THREE.Mesh(new THREE.SphereGeometry(p.head.r, 32, 24), mat); head.scale.set(0.82, 1.05, 0.92); head.position.set(0, p.head.y, 0.5); grp.add(head);
        for (const hd of p.hands) { const m = new THREE.Mesh(new THREE.SphereGeometry(3.4, 16, 12), mat); m.scale.set(0.7, 1.6, 0.9); m.position.set(hd.x, hd.y, hd.z); grp.add(m); }
        for (const f of p.feet) { const m = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 12), mat); m.scale.set(0.9, 0.6, 2.3); m.position.set(f.x, f.y + 2, f.z); grp.add(m); }
        return grp;
      };

      const skin = new THREE.MeshPhysicalMaterial({ color: 0xb8a4ff, roughness: 0.38, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.4, sheen: 1, sheenColor: new THREE.Color(0x22d3ee) });
      const root = new THREE.Group(); scene.add(root);
      root.add(build(entries[entries.length - 1], skin));
      let ghostGroup: InstanceType<typeof THREE.Group> | null = null;
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
