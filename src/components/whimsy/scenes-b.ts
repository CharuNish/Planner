/* Cherry blossoms (Calendar), Dandelions (Body & Health), Paper planes (Mini goals),
 * Shooting stars (Wins), Jellyfish (Updates). */
import { cloudLayer, glow, pick, rand, sway, TAU, vgrad, type SceneMaker } from "./engine";

/* ───────────── Cherry blossoms: a blossom branch, petals fall and swirl around your cursor ───────────── */
type Petal = { x: number; y: number; vx: number; vy: number; a: number; va: number; s: number; c: string; flip: number };
export const sakura: SceneMaker = (env) => {
  const { ctx } = env;
  let petals: Petal[] = [];
  let branch: HTMLCanvasElement | null = null;
  const COLORS = ["#ffd1dc", "#ffb7c9", "#ffe4ec", "#f9a8c0"];
  const newPetal = (x = rand(-50, env.W), y = rand(-60, -10)): Petal => ({ x, y, vx: rand(10, 30), vy: rand(20, 45), a: rand(0, TAU), va: rand(-2, 2), s: rand(5, 9), c: pick(COLORS), flip: rand(0, TAU) });
  function paintBranch(W: number, H: number) {
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d")!;
    const blossoms: [number, number][] = [];
    const grow = (px: number, py: number, ang: number, len: number, w: number, depth: number) => {
      const nx = px + Math.cos(ang) * len, ny = py + Math.sin(ang) * len;
      x.strokeStyle = "#3b2230"; x.lineWidth = w; x.lineCap = "round";
      x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo((px + nx) / 2 + rand(-10, 10), (py + ny) / 2 + rand(-10, 10), nx, ny); x.stroke();
      if (depth <= 0 || len < 14) { blossoms.push([nx, ny]); return; }
      const kids = depth > 3 ? 2 : 3;
      for (let k = 0; k < kids; k++) grow(nx, ny, ang + rand(-0.7, 0.7), len * rand(0.62, 0.8), w * 0.68, depth - 1);
      if (depth < 4) blossoms.push([nx, ny]);
    };
    const scale = Math.min(1, W / 1200) * (env.small ? 0.8 : 1);
    grow(W + 20, H * 0.05, Math.PI * 0.86, 170 * scale + 60, 16 * scale + 4, 6);
    grow(-20, H * 0.02, Math.PI * 0.12, 120 * scale + 40, 10 * scale + 3, 5);
    for (const [bx, by] of blossoms) {
      for (let k = 0; k < 5; k++) {
        const cx = bx + rand(-14, 14), cy = by + rand(-12, 12), r = rand(5, 9);
        x.fillStyle = pick(COLORS);
        for (let p = 0; p < 5; p++) { x.beginPath(); x.ellipse(cx + Math.cos((p * TAU) / 5) * r * 0.7, cy + Math.sin((p * TAU) / 5) * r * 0.7, r * 0.7, r * 0.45, (p * TAU) / 5, 0, TAU); x.fill(); }
        x.fillStyle = "#e0577f"; x.beginPath(); x.arc(cx, cy, r * 0.22, 0, TAU); x.fill();
      }
    }
    return c;
  }
  let hills: [number, number][][] = [];
  return {
    init() {
      const { W, H } = env;
      branch = paintBranch(W, H);
      petals = Array.from({ length: env.small ? 45 : 90 }, () => newPetal(rand(0, W), rand(0, H)));
      hills = [0, 1].map((k) => { const pts: [number, number][] = []; for (let x = -60; x <= W + 60; x += 30) pts.push([x, H * (0.84 + k * 0.08) - Math.sin(x / (240 + k * 90) + k) * 22]); return pts; });
    },
    click(x, y) { for (let i = 0; i < 24; i++) { const p = newPetal(x, y), a = rand(0, TAU), s = rand(60, 220); p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s; petals.push(p); } },
    frame(t, dt) {
      const { W, H, mouse } = env;
      vgrad(env, [[0, "#2a1f4a"], [0.45, "#6b4a7e"], [0.8, "#d98aa5"], [1, "#f6c7b6"]]);
      glow(ctx, W * 0.5, H * 0.85, Math.max(W, H) * 0.5, "rgba(255,210,190,.35)");
      const { mx, my } = sway(env, t);
      hills.forEach((pts, k) => { ctx.fillStyle = ["#7a4f7a", "#4e3256"][k]; ctx.beginPath(); ctx.moveTo(-60, H); for (const [x, y] of pts) ctx.lineTo(x - mx * (12 + k * 20), y - my * 6); ctx.lineTo(W + 60, H); ctx.fill(); });
      if (branch) ctx.drawImage(branch, -mx * 14, -my * 8 + Math.sin(t * 0.7) * 2);
      if (Math.random() < dt * (env.small ? 6 : 12)) petals.push(newPetal());
      for (const p of petals) {
        if (mouse.active) {
          const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy) || 1;
          if (d < 150) { const f = (1 - d / 150) * 420 * dt; p.vx += (-dy / d) * f + (dx / d) * f * 0.3; p.vy += (dx / d) * f + (dy / d) * f * 0.3; p.va += f * 0.05; }
        }
        p.vx += (Math.sin(t * 0.6 + p.flip) * 8 + 14 - p.vx) * dt * 0.8; p.vy += (35 - p.vy) * dt * 0.8;
        p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.va * dt; p.flip += dt * 2;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.scale(1, Math.abs(Math.sin(p.flip)) * 0.7 + 0.3);
        ctx.fillStyle = p.c; ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.quadraticCurveTo(p.s * 0.9, -p.s * 0.2, 0, p.s); ctx.quadraticCurveTo(-p.s * 0.9, -p.s * 0.2, 0, -p.s); ctx.fill();
        ctx.restore();
      }
      petals = petals.filter((p) => p.y < H + 30 && p.x < W + 60 && p.x > -80 && p.y > -120).slice(-260);
    },
  };
};

/* ───────────── Dandelions: golden meadow, wave your cursor over a dandelion to blow its seeds away ───────────── */
type Seed = { x: number; y: number; vx: number; vy: number; a: number; free: boolean; life: number };
type Dandelion = { x: number; h: number; seeds: Seed[]; regrow: number; ph: number };
export const dandelions: SceneMaker = (env) => {
  const { ctx } = env;
  let flowers: Dandelion[] = [], flying: Seed[] = [], clouds: HTMLCanvasElement | null = null;
  const R = env.small ? 26 : 34;
  const head = (d: Dandelion, t: number) => ({ x: d.x + Math.sin(t * 0.9 + d.ph) * 6, y: env.H - d.h });
  const fill = (d: Dandelion) => { d.seeds = Array.from({ length: 34 }, (_, i) => ({ x: 0, y: 0, vx: 0, vy: 0, a: (i / 34) * TAU + rand(-0.05, 0.05), free: false, life: 0 })); };
  function drawSeed(x: number, y: number, a: number, alpha: number, scale = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = alpha;
    ctx.strokeStyle = "rgba(255,255,245,.9)"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(R * 0.75 * scale, 0); ctx.stroke();
    for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(R * 0.75 * scale, 0); ctx.lineTo(R * 0.75 * scale + Math.cos(k * 0.35) * 7 * scale, Math.sin(k * 0.35) * 7 * scale); ctx.stroke(); }
    ctx.fillStyle = "#8a6a3a"; ctx.beginPath(); ctx.arc(0, 0, 1.4, 0, TAU); ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function blow(d: Dandelion, t: number, dirx: number, diry: number, strength: number) {
    const h = head(d, t);
    for (const s of d.seeds) if (!s.free && Math.random() < strength) {
      s.free = true; s.x = h.x + Math.cos(s.a) * R * 0.75; s.y = h.y + Math.sin(s.a) * R * 0.75;
      s.vx = dirx * rand(40, 110) + Math.cos(s.a) * 20; s.vy = diry * rand(40, 110) - rand(20, 50); s.life = 0; flying.push(s);
    }
    d.seeds = d.seeds.filter((s) => !s.free);
    if (!d.seeds.length) d.regrow = 7;
  }
  return {
    init() {
      const { W, H } = env;
      const n = Math.max(4, Math.round(W / (env.small ? 110 : 170)));
      flowers = Array.from({ length: n }, (_, i) => { const d: Dandelion = { x: ((i + 0.5) / n) * W + rand(-30, 30), h: rand(H * 0.18, H * 0.42), seeds: [], regrow: 0, ph: rand(0, TAU) }; fill(d); return d; });
      flying = [];
      clouds = cloudLayer(W, H, 12, () => `rgba(255,${rand(200, 230) | 0},${rand(180, 210) | 0},${rand(0.12, 0.25)})`, 0.05, 0.5);
    },
    click(x, y) { for (const d of flowers) { const h = head(d, performance.now() / 1000); const dist = Math.hypot(h.x - x, h.y - y); if (dist < 260) blow(d, performance.now() / 1000, Math.sign(h.x - x) || 1, -0.5, 1); } },
    frame(t, dt) {
      const { W, H, mouse } = env;
      vgrad(env, [[0, "#2b3a6b"], [0.45, "#c47a7a"], [0.75, "#f2b277"], [1, "#f8d79a"]]);
      glow(ctx, W * 0.72, H * 0.62, Math.max(W, H) * 0.45, "rgba(255,225,160,.55)");
      const { mx, my } = sway(env, t);
      if (clouds) ctx.drawImage(clouds, -mx * 30 + Math.sin(t * 0.04) * 30, -my * 10);
      ctx.fillStyle = "#6e8a3e"; ctx.beginPath(); ctx.moveTo(-60, H);
      for (let x = -60; x <= W + 60; x += 30) ctx.lineTo(x - mx * 18, H * 0.86 - Math.sin(x / 200) * 18 - my * 6);
      ctx.lineTo(W + 60, H); ctx.fill();
      for (const d of flowers) {
        const h = head(d, t);
        if (d.regrow > 0) { d.regrow -= dt; if (d.regrow <= 0) fill(d); }
        ctx.strokeStyle = "#4f6b2c"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(d.x, H); ctx.quadraticCurveTo(d.x, H - d.h * 0.5, h.x, h.y); ctx.stroke();
        ctx.fillStyle = "#4f6b2c"; ctx.beginPath(); ctx.ellipse(d.x - 12, H - 20, 18, 5, -0.6, 0, TAU); ctx.fill();
        if (d.seeds.length) {
          glow(ctx, h.x, h.y, R * 1.6, "rgba(255,255,240,.35)");
          for (const s of d.seeds) drawSeed(h.x, h.y, s.a + Math.sin(t + d.ph) * 0.05, 0.95);
          if (mouse.active) {
            const dist = Math.hypot(mouse.x - h.x, mouse.y - h.y), spd = Math.hypot(mouse.x - mouse.px, mouse.y - mouse.py);
            if (dist < R * 2.2 && spd > 2) blow(d, t, (mouse.x - mouse.px) / (spd || 1), (mouse.y - mouse.py) / (spd || 1) - 0.4, Math.min(0.5, spd * 0.03));
          }
        } else { ctx.fillStyle = "#9a7a45"; ctx.beginPath(); ctx.arc(h.x, h.y, 4, 0, TAU); ctx.fill(); }
      }
      for (const s of flying) {
        s.life += dt; s.vx += (18 + Math.sin(t + s.a) * 10 - s.vx) * dt * 0.4; s.vy += (-12 + Math.cos(t * 1.3 + s.a) * 8 - s.vy) * dt * 0.4;
        s.x += s.vx * dt; s.y += s.vy * dt; s.a += Math.sin(t * 2 + s.life) * dt * 0.6;
        drawSeed(s.x, s.y, -Math.PI / 2 + Math.sin(t * 2 + s.life) * 0.4, Math.max(0, 1 - s.life / 14), 0.9);
      }
      flying = flying.filter((s) => s.life < 14 && s.y > -60 && s.x < W + 60);
    },
  };
};

/* ───────────── Paper planes: soft sky, planes glide by and swerve around your cursor, tap throws one ───────────── */
type Plane = { x: number; y: number; vx: number; vy: number; s: number; c: string; trail: [number, number][]; ph: number };
export const planes: SceneMaker = (env) => {
  const { ctx } = env;
  let list: Plane[] = [], clouds: HTMLCanvasElement | null = null, clouds2: HTMLCanvasElement | null = null;
  const COLORS = ["#ffffff", "#ffe3ec", "#e3f0ff", "#fff3d6", "#e9e1ff"];
  const throwPlane = (x = -40, y = rand(env.H * 0.1, env.H * 0.7), vx = rand(60, 110), vy = rand(-15, 10)) =>
    list.push({ x, y, vx, vy, s: rand(0.7, 1.3) * (env.small ? 0.8 : 1), c: pick(COLORS), trail: [], ph: rand(0, TAU) });
  return {
    init() {
      const { W, H } = env;
      clouds = cloudLayer(W, H, 14, () => `rgba(255,255,255,${rand(0.25, 0.45)})`, 0.1, 0.9);
      clouds2 = cloudLayer(W, H, 8, () => `rgba(255,236,245,${rand(0.3, 0.5)})`, 0.5, 1);
      list = []; for (let i = 0; i < (env.small ? 4 : 7); i++) throwPlane(rand(0, W), rand(H * 0.1, H * 0.8));
    },
    click(x, y) { throwPlane(x, y, rand(110, 160), rand(-40, -10)); },
    frame(t, dt) {
      const { W, H, mouse } = env;
      vgrad(env, [[0, "#3f6aa3"], [0.55, "#7d9fcb"], [0.85, "#c99ab4"], [1, "#e7b39c"]]);
      const { mx, my } = sway(env, t);
      if (clouds) ctx.drawImage(clouds, -mx * 20 + Math.sin(t * 0.05) * 30, -my * 8);
      if (Math.random() < dt * 0.35 && list.length < (env.small ? 8 : 14)) throwPlane();
      for (const p of list) {
        if (mouse.active) {
          const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy) || 1;
          if (d < 160) { const f = (1 - d / 160) * 300 * dt; p.vx += (dx / d) * f; p.vy += (dy / d) * f * 1.4; }
        }
        p.vy += Math.sin(t * 1.2 + p.ph) * 14 * dt; p.vy *= 0.985; p.vx += (85 - p.vx) * dt * 0.3;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.trail.push([p.x, p.y]); if (p.trail.length > 40) p.trail.shift();
        ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.setLineDash([4, 8]); ctx.lineWidth = 1.5; ctx.beginPath();
        p.trail.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.setLineDash([]);
        const a = Math.atan2(p.vy, p.vx), s = 30 * p.s;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
        ctx.fillStyle = "rgba(40,60,100,.12)"; ctx.beginPath(); ctx.moveTo(s + 4, 10); ctx.lineTo(-s + 4, -s * 0.6 + 10); ctx.lineTo(-s * 0.6 + 4, 10); ctx.lineTo(-s + 4, s * 0.6 + 10); ctx.fill();
        ctx.fillStyle = p.c; ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s, -s * 0.62); ctx.lineTo(-s * 0.55, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,.12)"; ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s, s * 0.62); ctx.lineTo(-s * 0.55, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = p.c; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s, s * 0.62); ctx.lineTo(-s * 0.45, s * 0.12); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
        ctx.restore();
      }
      list = list.filter((p) => p.x < W + 80 && p.y > -120 && p.y < H + 120);
      if (clouds2) ctx.drawImage(clouds2, -mx * 50, H * 0.08 - my * 16);
    },
  };
};

/* ───────────── Shooting stars: a purple night, stars join into constellations around your cursor ───────────── */
type Star = { x: number; y: number; r: number; t: number; s: number; d: number };
export const stars: SceneMaker = (env) => {
  const { ctx } = env;
  let field: Star[] = [], shooting: { x: number; y: number; vx: number; vy: number; life: number }[] = [], trail: { x: number; y: number; life: number; c: string }[] = [];
  let neb: HTMLCanvasElement | null = null;
  const shoot = (x = rand(0, env.W), y = rand(0, env.H * 0.4)) => { const a = rand(0.35, 0.7); shooting.push({ x, y, vx: Math.cos(a) * 700, vy: Math.sin(a) * 700, life: 0 }); };
  return {
    init() {
      const { W, H } = env;
      field = Array.from({ length: Math.round((W * H) / (env.small ? 3200 : 2400)) }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(0.4, 1.8), t: rand(0, TAU), s: rand(0.5, 2.2), d: rand(0.2, 1) }));
      neb = cloudLayer(W, H, 14, () => pick(["rgba(190,90,255,.18)", "rgba(255,110,190,.14)", "rgba(90,140,255,.16)"]), 0.1, 0.9);
    },
    click(x, y) { for (let i = 0; i < 3; i++) shoot(x - rand(0, 200), y - rand(0, 120)); },
    frame(t, dt) {
      const { mouse } = env;
      vgrad(env, [[0, "#07041a"], [0.5, "#1c0f3d"], [1, "#3a1550"]]);
      const { mx, my } = sway(env, t);
      if (neb) ctx.drawImage(neb, -mx * 25, -my * 15);
      const near: Star[] = [];
      for (const s of field) {
        const x = s.x - mx * 30 * s.d, y = s.y - my * 20 * s.d;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * s.s + s.t));
        ctx.fillStyle = `rgba(255,255,255,${tw})`; ctx.beginPath(); ctx.arc(x, y, s.r, 0, TAU); ctx.fill();
        if (mouse.active && Math.hypot(x - mouse.x, y - mouse.y) < 160) near.push({ ...s, x, y });
      }
      ctx.strokeStyle = "rgba(200,180,255,.35)"; ctx.lineWidth = 1;
      for (let i = 0; i < near.length; i++) for (let j = i + 1; j < near.length; j++) {
        const d = Math.hypot(near[i].x - near[j].x, near[i].y - near[j].y);
        if (d < 90) { ctx.globalAlpha = 1 - d / 90; ctx.beginPath(); ctx.moveTo(near[i].x, near[i].y); ctx.lineTo(near[j].x, near[j].y); ctx.stroke(); }
      }
      ctx.globalAlpha = 1;
      for (const s of near) glow(ctx, s.x, s.y, 8, "rgba(255,230,255,.7)");
      if (mouse.active && Math.hypot(mouse.x - mouse.px, mouse.y - mouse.py) > 1) for (let i = 0; i < 2; i++) trail.push({ x: mouse.x + rand(-6, 6), y: mouse.y + rand(-6, 6), life: 0, c: pick(["#ffd6f5", "#fff4b8", "#c9b8ff"]) });
      ctx.globalCompositeOperation = "lighter";
      for (const p of trail) { p.life += dt; p.y += 12 * dt; const a = Math.max(0, 1 - p.life / 1.2); ctx.fillStyle = p.c; ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(p.x, p.y, 1.8 * a + 0.4, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
      trail = trail.filter((p) => p.life < 1.2).slice(-200);
      if (Math.random() < dt * 0.4) shoot();
      for (const s of shooting) {
        s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt;
        const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 0.18, s.y - s.vy * 0.18);
        g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(1, "rgba(255,200,255,0)");
        ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.18, s.y - s.vy * 0.18); ctx.stroke();
        glow(ctx, s.x, s.y, 10, "rgba(255,255,255,.8)");
      }
      ctx.globalCompositeOperation = "source-over";
      shooting = shooting.filter((s) => s.life < 1.6);
    },
  };
};

/* ───────────── Jellyfish: real jellyfish photos (public/whimsy/jelly-N.webp) pulse and drift up through
 * deep-ocean light rays, swerve away from your cursor, and a click sends up bubbles and startles them. ───────────── */
const JELLY_SRC = [1, 2, 3, 4, 5].map((n) => `/whimsy/jelly-${n}.webp`);
/** Glow colour behind each photo, and whether it swims sideways (jelly 4 faces right) instead of rising. */
const JELLY_LOOK: { glow: string; side?: boolean }[] = [
  { glow: "200,230,255" }, { glow: "90,150,255" }, { glow: "255,170,110" }, { glow: "255,120,130", side: true }, { glow: "255,120,220" },
];
type Jelly = { x: number; y: number; vx: number; vy: number; d: number; img: number; ph: number };
export const jellyfish: SceneMaker = (env) => {
  const { ctx } = env;
  const imgs = JELLY_SRC.map((src) => { const i = new Image(); i.decoding = "async"; i.src = src; return i; });
  let jellies: Jelly[] = [], bubbles: { x: number; y: number; r: number; v: number }[] = [], motes: { x: number; y: number; r: number; ph: number }[] = [];
  const spawn = (img: number, x: number, y: number): Jelly => ({ x, y, vx: 0, vy: 0, d: rand(0.35, 1), img, ph: rand(0, TAU) });
  return {
    init() {
      const { W, H } = env;
      const n = env.small ? 5 : 8;
      // Spread them out: each gets its own column and its own height band, shuffled so they don't line up
      const rows = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5);
      jellies = Array.from({ length: n }, (_, i) => spawn(i % imgs.length, ((i + rand(0.25, 0.75)) / n) * W, ((rows[i] + rand(0.2, 0.8)) / n) * H * 1.1));
      jellies.sort((a, b) => a.d - b.d); // far ones first so near ones draw on top
      motes = Array.from({ length: 80 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(0.5, 1.6), ph: rand(0, TAU) }));
      bubbles = [];
    },
    click(x, y) {
      for (let i = 0; i < 14; i++) bubbles.push({ x: x + rand(-14, 14), y: y + rand(-8, 8), r: rand(2, 7), v: rand(40, 90) });
      for (const j of jellies) { const dx = j.x - x, dy = j.y - y, d = Math.hypot(dx, dy) || 1; if (d < 320) { j.vx += (dx / d) * 120 * (1 - d / 320); j.vy += (dy / d) * 120 * (1 - d / 320); } }
    },
    frame(t, dt) {
      const { W, H, mouse } = env;
      vgrad(env, [[0, "#0b4a6e"], [0.4, "#07304d"], [1, "#030d1f"]]);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 6; i++) {
        const x = W * (0.1 + i * 0.17) + Math.sin(t * 0.2 + i) * 40;
        const g = ctx.createLinearGradient(x, 0, x + 120, H * 0.8); g.addColorStop(0, "rgba(140,220,255,.10)"); g.addColorStop(1, "rgba(140,220,255,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 30, 0); ctx.lineTo(x + 30, 0); ctx.lineTo(x + 220, H); ctx.lineTo(x + 60, H); ctx.fill();
      }
      for (const m of motes) { m.y -= 4 * dt; if (m.y < -5) m.y = H + 5; ctx.fillStyle = `rgba(180,240,255,${0.25 + 0.25 * Math.sin(t + m.ph)})`; ctx.beginPath(); ctx.arc(m.x + Math.sin(t * 0.5 + m.ph) * 6, m.y, m.r, 0, TAU); ctx.fill(); }
      ctx.globalCompositeOperation = "source-over";
      const base = Math.min(H * 0.46, env.small ? 240 : 400);
      for (const j of jellies) {
        const img = imgs[j.img], look = JELLY_LOOK[j.img];
        const pulse = Math.sin(t * 1.4 + j.ph), push = Math.max(0, pulse);
        // Swim: a push on each pulse, a gentle sideways wander, and water drag
        if (look.side) { j.vx += push * 26 * j.d * dt; j.vy += Math.sin(t * 0.4 + j.ph) * 4 * dt; }
        else { j.vy -= push * 30 * j.d * dt; j.vx += Math.sin(t * 0.3 + j.ph) * 3 * dt; }
        if (mouse.active) { const dx = j.x - mouse.x, dy = j.y - mouse.y, dd = Math.hypot(dx, dy) || 1; if (dd < 220) { const f = (1 - dd / 220) * 110 * dt; j.vx += (dx / dd) * f; j.vy += (dy / dd) * f; } }
        j.vx *= 1 - dt * 0.9; j.vy *= 1 - dt * 0.9;
        j.x += j.vx * dt; j.y += j.vy * dt;
        if (!img.complete || !img.naturalWidth) continue;
        // Size by depth: far jellies are small, faint and slow
        const sc = (look.side ? base * 0.85 / img.naturalWidth : base / img.naturalHeight) * (0.4 + j.d * 0.6);
        const w = img.naturalWidth * sc, h = img.naturalHeight * sc;
        if (j.y < -h - 40) { j.y = H + 40; j.x = rand(0.05, 0.95) * W; } if (j.y > H + h + 60) j.y = -h;
        if (j.x < -w - 60) j.x = W + 40; if (j.x > W + w + 60) j.x = -w * 0.6;
        const a = 0.45 + j.d * 0.5;
        ctx.save(); ctx.translate(j.x, j.y);
        ctx.globalCompositeOperation = "lighter";
        glow(ctx, 0, look.side ? 0 : h * 0.12, Math.max(w, h) * 0.5, `rgba(${look.glow},${0.16 * a})`);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = a;
        if (look.side) {
          // Swims to the right: bell at the front squeezes on each pulse, tentacles trail behind
          ctx.rotate(Math.atan2(j.vy, Math.max(8, j.vx)) * 0.5);
          ctx.scale(1 + pulse * 0.04, 1 - pulse * 0.06);
          ctx.drawImage(img, -w * 0.75, -h / 2, w, h);
        } else {
          // Rises bell-first: the bell widens and flattens on each pulse, pivoting from the top
          ctx.rotate(Math.max(-0.25, Math.min(0.25, j.vx * 0.012)));
          ctx.scale(1 + pulse * 0.06, 1 - pulse * 0.05);
          ctx.drawImage(img, -w / 2, -h * 0.12, w, h);
        }
        ctx.restore();
      }
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(200,240,255,.6)"; ctx.lineWidth = 1;
      for (const b of bubbles) { b.y -= b.v * dt; b.x += Math.sin(t * 3 + b.r) * 0.4; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke(); }
      bubbles = bubbles.filter((b) => b.y > -20);
      if (mouse.active && Math.random() < dt * 2) bubbles.push({ x: mouse.x, y: mouse.y, r: rand(1.5, 4), v: rand(30, 60) });
      ctx.globalCompositeOperation = "source-over";
    },
  };
};
