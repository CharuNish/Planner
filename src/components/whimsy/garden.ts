/* Garden portal (Mini goals): a wisteria archway opening onto pink clouds, built from three picture layers
 * in public/whimsy/ that slide at different depths with the cursor, plus falling petals, sparkles,
 * light rays and butterflies drawn on top. A click scatters a burst of petals. */
import { glow, pick, rand, sway, TAU, vgrad, type SceneMaker } from "./engine";

const load = (src: string) => { const i = new Image(); i.decoding = "async"; i.src = src; return i; };

type Petal = { x: number; y: number; vx: number; vy: number; a: number; va: number; s: number; c: string; flip: number };
type Fly = { x: number; y: number; tx: number; ty: number; ph: number; c: string; s: number };

export const garden: SceneMaker = (env) => {
  const { ctx } = env;
  const sky = load("/whimsy/garden-sky.webp"), arch = load("/whimsy/garden-arch.webp"), front = load("/whimsy/garden-front.webp");
  let petals: Petal[] = [], sparks: { x: number; y: number; r: number; ph: number; v: number }[] = [], flies: Fly[] = [];
  const COLORS = ["#c9a7ff", "#b48cf2", "#e3d0ff", "#f3c6ff", "#9f7ae0"];
  const newPetal = (x = rand(0, env.W), y = rand(-40, -10)): Petal => ({ x, y, vx: rand(-8, 12), vy: rand(18, 40), a: rand(0, TAU), va: rand(-2, 2), s: rand(4, 7), c: pick(COLORS), flip: rand(0, TAU) });

  /** Draw an image covering the screen (like CSS background-size: cover), with room to slide. */
  function cover(img: HTMLImageElement, ox: number, oy: number, zoom: number, focusY = 0.5) {
    if (!img.complete || !img.naturalWidth) return null;
    const { W, H } = env;
    const s = Math.max(W / img.naturalWidth, H / img.naturalHeight) * zoom;
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    const x = (W - w) / 2 + ox, y = (H - h) * focusY + oy;
    ctx.drawImage(img, x, y, w, h);
    return { x, y, w, h };
  }

  return {
    init() {
      const { W, H } = env;
      petals = Array.from({ length: env.small ? 30 : 60 }, () => newPetal(rand(0, W), rand(0, H)));
      sparks = Array.from({ length: env.small ? 30 : 55 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(0.8, 2.2), ph: rand(0, TAU), v: rand(4, 12) }));
      flies = Array.from({ length: 3 }, () => ({ x: rand(0, W), y: rand(H * 0.3, H * 0.7), tx: rand(0, W), ty: rand(0, H), ph: rand(0, TAU), c: pick(["#ffd6f6", "#fff1a8", "#d6c4ff"]), s: rand(0.8, 1.2) }));
    },
    click(x, y) {
      for (let i = 0; i < 26; i++) { const p = newPetal(x, y), a = rand(0, TAU), s = rand(60, 200); p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s; petals.push(p); }
      for (const f of flies) { f.tx = x + rand(-60, 60); f.ty = y + rand(-60, 60); }
    },
    frame(t, dt) {
      const { W, H, mouse } = env;
      const { mx, my } = sway(env, t);
      vgrad(env, [[0, "#b9a3e6"], [0.5, "#f2b6d6"], [1, "#2a1c3d"]]);
      // Back: clouds, barely moving and drifting slowly
      cover(sky, -mx * 10 + Math.sin(t * 0.05) * 18, -my * 6, 1.12, 0.62);
      // Glow through the portal
      const portal = { x: W / 2 - mx * 26, y: H * 0.52 - my * 14 };
      ctx.globalCompositeOperation = "lighter";
      glow(ctx, portal.x, portal.y, Math.min(W, H) * (0.32 + Math.sin(t * 0.8) * 0.02), "rgba(255,210,235,.28)");
      ctx.globalCompositeOperation = "source-over";
      // Middle: the archway
      cover(arch, -mx * 28, -my * 14, 1.08, 0.55);
      // Light rays falling through the canopy
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 5; i++) {
        const x0 = portal.x + (i - 2) * W * 0.06 + Math.sin(t * 0.3 + i) * 10, a = 0.05 + 0.03 * Math.sin(t * 0.7 + i * 1.3);
        const g = ctx.createLinearGradient(x0, 0, x0, H); g.addColorStop(0, `rgba(255,236,250,${a})`); g.addColorStop(1, "rgba(255,236,250,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0 - 18, 0); ctx.lineTo(x0 + 18, 0); ctx.lineTo(x0 + 90 + i * 20, H); ctx.lineTo(x0 - 90 - i * 20, H); ctx.fill();
      }
      // Sparkles drifting up, drawn toward the cursor
      for (const s of sparks) {
        s.y -= s.v * dt; s.x += Math.sin(t * 0.6 + s.ph) * 0.3;
        if (mouse.active) { const dx = mouse.x - s.x, dy = mouse.y - s.y, d = Math.hypot(dx, dy) || 1; if (d < 220) { s.x += (dx / d) * 22 * dt; s.y += (dy / d) * 22 * dt; } }
        if (s.y < -10) { s.y = H + 10; s.x = rand(0, W); }
        const a = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.5 + s.ph));
        glow(ctx, s.x, s.y, s.r * 6, `rgba(255,240,200,${0.55 * a})`, "rgba(255,220,180,0)");
      }
      ctx.globalCompositeOperation = "source-over";
      // Butterflies that wander and follow the cursor
      for (const f of flies) {
        if (mouse.active && Math.hypot(mouse.x - f.x, mouse.y - f.y) < 340) { f.tx = mouse.x + Math.sin(t * 1.4 + f.ph) * 50; f.ty = mouse.y + Math.cos(t * 1.1 + f.ph) * 40; }
        else if (Math.hypot(f.tx - f.x, f.ty - f.y) < 30) { f.tx = rand(W * 0.1, W * 0.9); f.ty = rand(H * 0.15, H * 0.8); }
        f.x += (f.tx - f.x) * dt * 0.8 + Math.sin(t * 3 + f.ph) * 0.6; f.y += (f.ty - f.y) * dt * 0.8 + Math.cos(t * 4 + f.ph) * 0.6;
        const flap = Math.abs(Math.sin(t * 14 + f.ph)), s = 9 * f.s, dir = f.tx > f.x ? 1 : -1;
        ctx.save(); ctx.translate(f.x, f.y); ctx.scale(dir, 1);
        glow(ctx, 0, 0, s * 3, "rgba(255,220,250,.25)");
        ctx.fillStyle = f.c;
        for (const side of [-1, 1]) {
          ctx.save(); ctx.scale(1, side); ctx.scale(0.25 + flap * 0.75, 1);
          ctx.beginPath(); ctx.ellipse(-s * 0.2, -s * 0.7, s * 0.9, s * 0.7, -0.5, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.ellipse(-s * 0.1, -s * 0.15, s * 0.55, s * 0.45, 0.4, 0, TAU); ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = "#3a2a4a"; ctx.fillRect(-s * 0.6, -1, s * 1.2, 2);
        ctx.restore();
      }
      // Front: the near flowers and canopy, moving the most
      cover(front, -mx * 60, -my * 30, 1.16, 0.55);
      // Falling wisteria petals, swirling around the cursor
      if (Math.random() < dt * (env.small ? 4 : 8)) petals.push(newPetal());
      for (const p of petals) {
        if (mouse.active) { const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy) || 1; if (d < 140) { const f = (1 - d / 140) * 380 * dt; p.vx += (-dy / d) * f + (dx / d) * f * 0.3; p.vy += (dx / d) * f + (dy / d) * f * 0.3; } }
        p.vx += (Math.sin(t * 0.5 + p.flip) * 10 - p.vx) * dt * 0.8; p.vy += (32 - p.vy) * dt * 0.8;
        p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.va * dt; p.flip += dt * 2.2;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.scale(1, Math.abs(Math.sin(p.flip)) * 0.7 + 0.3);
        ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.6, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
      petals = petals.filter((p) => p.y < H + 30 && p.y > -120 && p.x > -80 && p.x < W + 80).slice(-220);
      // Soft dark edge so the page text stays readable
      const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      v.addColorStop(0, "rgba(10,6,20,0)"); v.addColorStop(1, "rgba(10,6,20,.45)");
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    },
  };
};
