"use client";
import { useEffect, useRef } from "react";

/**
 * Animated 3D background: a slowly turning wireframe planet inside a drifting star/particle field,
 * with a little mouse parallax. Pauses when the tab is hidden and stays still for "reduce motion".
 */
export function Background3D() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cleanup = () => {};
    let cancelled = false;
    (async () => {
      const THREE = await import("three");
      const el = ref.current;
      if (!el || cancelled) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const small = window.innerWidth < 768;
      const renderer = new THREE.WebGLRenderer({ antialias: !small, alpha: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.25 : 1.75));
      renderer.setSize(window.innerWidth, window.innerHeight);
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x070912, 0.045);
      const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.set(0, 0, 12);

      // Particle field
      const count = small ? 900 : 2200;
      const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
      const c1 = new THREE.Color("#8b5cf6"), c2 = new THREE.Color("#22d3ee"), c3 = new THREE.Color("#ec4899");
      for (let i = 0; i < count; i++) {
        const r = 6 + Math.random() * 22, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
        pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th) * 0.6, r * Math.cos(ph) - 6], i * 3);
        const c = [c1, c2, c3][i % 7 === 0 ? 2 : i % 2];
        col.set([c.r, c.g, c.b], i * 3);
      }
      const pg = new THREE.BufferGeometry();
      pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      pg.setAttribute("color", new THREE.BufferAttribute(col, 3));
      const pm = new THREE.PointsMaterial({ size: small ? 0.06 : 0.05, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending });
      const points = new THREE.Points(pg, pm);
      scene.add(points);

      // Wireframe planet + ring
      const planet = new THREE.Group();
      const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6, 2), new THREE.MeshBasicMaterial({ color: 0x8b5cf6, wireframe: true, transparent: true, opacity: 0.22 }));
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 3), new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true, transparent: true, opacity: 0.08 }));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(4, 0.012, 8, 160), new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.35 }));
      ring.rotation.x = Math.PI / 2.3;
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(4.8, 0.008, 8, 160), new THREE.MeshBasicMaterial({ color: 0xec4899, transparent: true, opacity: 0.2 }));
      ring2.rotation.x = Math.PI / 1.9; ring2.rotation.y = 0.4;
      planet.add(ico, core, ring, ring2);
      planet.position.set(small ? 2.5 : 6.5, small ? 3.5 : 1.2, -2);
      scene.add(planet);

      let mx = 0, my = 0, raf = 0, running = true;
      const onMove = (e: PointerEvent) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; };
      const onResize = () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); };
      const onVis = () => { running = !document.hidden; if (running && !reduce) loop(); };
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("resize", onResize);
      document.addEventListener("visibilitychange", onVis);

      const clock = new THREE.Clock();
      const frame = () => {
        const t = clock.getElapsedTime();
        points.rotation.y = t * 0.015; points.rotation.x = Math.sin(t * 0.05) * 0.05;
        ico.rotation.y = t * 0.08; ico.rotation.x = t * 0.03; core.rotation.y = -t * 0.05;
        ring.rotation.z = t * 0.05; ring2.rotation.z = -t * 0.03;
        camera.position.x += (mx * 1.2 - camera.position.x) * 0.03;
        camera.position.y += (-my * 0.8 - camera.position.y) * 0.03;
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
      };
      const loop = () => { if (!running) return; frame(); raf = requestAnimationFrame(loop); };
      if (reduce) frame(); else loop();

      cleanup = () => {
        running = false; cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onMove); window.removeEventListener("resize", onResize); document.removeEventListener("visibilitychange", onVis);
        renderer.dispose(); pg.dispose(); pm.dispose(); el.removeChild(renderer.domElement);
      };
    })();
    return () => { cancelled = true; cleanup(); };
  }, []);
  return <div ref={ref} aria-hidden className="fixed inset-0 -z-10 pointer-events-none" style={{ opacity: 0.9 }} />;
}
