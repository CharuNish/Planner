/* Garden portal (Mini goals): a wisteria archway opening onto pink clouds, built from three picture layers
 * in public/whimsy/ that slide at different depths with the cursor, a slow glide-in when the page opens,
 * drifting petals and sparkles, and a glowing orb that trails the cursor. A click scatters petals. */
import { glow, pick, rand, sway, TAU, vgrad, type SceneMaker } from "./engine";

const load = (src: string) => { const i = new Image(); i.decoding = "async"; i.src = src; return i; };

type Petal = { x: number; y: number; vx: number; vy: number; a: number; va: number; s: number; c: string; flip: number };

export const garden: SceneMaker = (env) => {
  const { ctx } = env;
  const sky = load("/whimsy/garden-sky.webp"), arch = load("/whimsy/garden-arch.webp"), front = load("/whimsy/garden-front.webp");
  const orb = { x: 0, y: 0 };
  let petals: Petal[] = [], sparks: { x: number; y: number; r: number; ph: number; v: number }[] = [];
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
      petals = Array.from({ length: env.small ? 15 : 30 }, () => newPetal(rand(0, W), rand(0, H)));
      sparks = Array.from({ length: env.small ? 18 : 32 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(0.8, 2.2), ph: rand(0, TAU), v: rand(4, 12) }));
    },
    click(x, y) {
      for (let i = 0; i < 26; i++) { const p = newPetal(x, y), a = rand(0, TAU), s = rand(60, 200); p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s; petals.push(p); }
    },
    frame(t, dt) {
      const { W, H, mouse } = env;
      const { mx, my } = sway(env, t);
      vgrad(env, [[0, "#b9a3e6"], [0.5, "#f2b6d6"], [1, "#2a1c3d"]]);
      // Opening shot: the camera glides into the garden over the first few seconds
      const k = 1 - (1 - Math.min(1, t / 4)) ** 3, intro = (1 - k) * 0.22;
      // Back: clouds, barely moving and drifting slowly
      cover(sky, -mx * 12 + Math.sin(t * 0.04) * 26, -my * 8 + Math.cos(t * 0.05) * 6, 1.12 + intro * 0.5 + Math.sin(t * 0.07) * 0.015, 0.62);
      // Glow through the portal
      const portal = { x: W / 2 - mx * 26, y: H * 0.52 - my * 14 };
      ctx.globalCompositeOperation = "lighter";
      glow(ctx, portal.x, portal.y, Math.min(W, H) * (0.32 + Math.sin(t * 0.8) * 0.02), "rgba(255,210,235,.28)");
      ctx.globalCompositeOperation = "source-over";
      // Middle: the archway
      cover(arch, -mx * 34, -my * 18, 1.08 + intro, 0.55);
      ctx.globalCompositeOperation = "lighter";
      // Sparkles drifting up, drawn toward the cursor
      for (const s of sparks) {
        s.y -= s.v * dt; s.x += Math.sin(t * 0.6 + s.ph) * 0.3;
        if (mouse.active) { const dx = mouse.x - s.x, dy = mouse.y - s.y, d = Math.hypot(dx, dy) || 1; if (d < 220) { s.x += (dx / d) * 22 * dt; s.y += (dy / d) * 22 * dt; } }
        if (s.y < -10) { s.y = H + 10; s.x = rand(0, W); }
        const a = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.5 + s.ph));
        glow(ctx, s.x, s.y, s.r * 6, `rgba(255,240,200,${0.55 * a})`, "rgba(255,220,180,0)");
      }
      ctx.globalCompositeOperation = "source-over";
      // Front: the near flowers and canopy, moving the most
      cover(front, -mx * 70, -my * 36, 1.16 + intro * 1.6, 0.55);
      // Falling wisteria petals, swirling around the cursor
      if (Math.random() < dt * (env.small ? 2 : 4)) petals.push(newPetal());
      for (const p of petals) {
        if (mouse.active) { const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy) || 1; if (d < 140) { const f = (1 - d / 140) * 380 * dt; p.vx += (-dy / d) * f + (dx / d) * f * 0.3; p.vy += (dx / d) * f + (dy / d) * f * 0.3; } }
        p.vx += (Math.sin(t * 0.5 + p.flip) * 10 - p.vx) * dt * 0.8; p.vy += (32 - p.vy) * dt * 0.8;
        p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.va * dt; p.flip += dt * 2.2;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.scale(1, Math.abs(Math.sin(p.flip)) * 0.7 + 0.3);
        ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.6, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
      petals = petals.filter((p) => p.y < H + 30 && p.y > -120 && p.x > -80 && p.x < W + 80).slice(-220);
      // A soft glowing orb that trails the cursor
      if (mouse.active) {
        orb.x += (mouse.x - orb.x) * Math.min(1, dt * 6); orb.y += (mouse.y - orb.y) * Math.min(1, dt * 6);
        ctx.globalCompositeOperation = "lighter";
        glow(ctx, orb.x, orb.y, 46, "rgba(255,235,250,.22)");
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.beginPath(); ctx.arc(orb.x, orb.y, 5, 0, TAU); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(orb.x, orb.y, 18 + Math.sin(t * 2) * 2, 0, TAU); ctx.stroke();
      } else { orb.x = env.W / 2; orb.y = env.H / 2; }
      // Soft dark edge so the page text stays readable
      const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      v.addColorStop(0, "rgba(10,6,20,0)"); v.addColorStop(1, "rgba(10,6,20,.45)");
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    },
  };
};
