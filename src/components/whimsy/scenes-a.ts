/* Lanterns (Home, login), Koi pond (Finance), Wind chimes (Studies), Fireflies (Habits). */
import { cloudLayer, glow, pick, rand, sway, TAU, vgrad, type SceneMaker } from "./engine";

/* ───────────── Lanterns: night sky, lanterns drift up, cursor nudges them, tap releases one ───────────── */
type Lantern = { x: number; y: number; vx: number; vy: number; s: number; ph: number; fl: number; rise: number };
export const lanterns: SceneMaker = (env) => {
  const { ctx } = env;
  let stars: { x: number; y: number; r: number; t: number; s: number }[] = [];
  let list: Lantern[] = [];
  let clouds: HTMLCanvasElement | null = null;
  let hills: [number, number][][] = [];
  const spawn = (x = rand(0, env.W), y = env.H + 40, big = false) =>
    list.push({ x, y, vx: 0, vy: 0, s: big ? rand(1.1, 1.4) : rand(0.45, 1.05), ph: rand(0, TAU), fl: rand(0, TAU), rise: rand(0.25, 0.55) });
  function draw(l: Lantern, t: number) {
    const s = l.s * 22, f = 0.85 + Math.sin(t * 9 + l.fl) * 0.06 + Math.sin(t * 23 + l.fl) * 0.04;
    ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(Math.sin(t * 0.8 + l.ph) * 0.08 + l.vx * 0.03);
    glow(ctx, 0, 0, s * 3.2, `rgba(255,170,80,${0.45 * f})`, "rgba(255,120,40,0)");
    const b = ctx.createLinearGradient(0, -s, 0, s);
    b.addColorStop(0, "#ffcf8a"); b.addColorStop(0.6, "#ff9a3c"); b.addColorStop(1, "#ff6a2a");
    ctx.fillStyle = b; ctx.beginPath();
    ctx.moveTo(-s * 0.55, -s); ctx.quadraticCurveTo(0, -s * 1.15, s * 0.55, -s); ctx.quadraticCurveTo(s * 0.75, 0, s * 0.42, s * 0.9);
    ctx.lineTo(-s * 0.42, s * 0.9); ctx.quadraticCurveTo(-s * 0.75, 0, -s * 0.55, -s); ctx.fill();
    ctx.fillStyle = `rgba(255,250,210,${0.9 * f})`; ctx.beginPath(); ctx.ellipse(0, s * 0.55, s * 0.2, s * 0.28, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(120,40,10,.5)"; ctx.fillRect(-s * 0.42, s * 0.86, s * 0.84, s * 0.1);
    ctx.restore();
  }
  return {
    init() {
      const { W, H } = env;
      stars = Array.from({ length: Math.round((W * H) / 3500) }, () => ({ x: rand(0, W), y: rand(0, H * 0.75), r: rand(0.3, 1.4), t: rand(0, TAU), s: rand(0.5, 2) }));
      clouds = cloudLayer(W, H, 16, () => `rgba(${rand(90, 140) | 0},${rand(110, 150) | 0},210,${rand(0.08, 0.18)})`, 0.25, 0.8);
      hills = [0, 1, 2].map((k) => {
        const pts: [number, number][] = [];
        for (let x = -60; x <= W + 60; x += 30) pts.push([x, H * (0.8 + k * 0.07) - Math.sin(x / (180 + k * 70) + k * 2) * 26 - Math.sin(x / 63 + k) * 8]);
        return pts;
      });
      list = [];
      for (let i = 0; i < (env.small ? 14 : 26); i++) spawn(rand(0, W), rand(H * 0.1, H));
    },
    click(x, y) { spawn(x, y, true); },
    frame(t, dt) {
      const { W, H, mouse } = env;
      vgrad(env, [[0, "#050817"], [0.5, "#121a45"], [1, "#2b2463"]]);
      ctx.fillStyle = "#fff";
      for (const s of stars) { ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * s.s + s.t)); ctx.fillRect(s.x, s.y, s.r, s.r); }
      ctx.globalAlpha = 1;
      const { mx, my } = sway(env, t);
      if (clouds) ctx.drawImage(clouds, -mx * 30 + Math.sin(t * 0.05) * 20, -my * 12);
      hills.forEach((pts, k) => {
        ctx.fillStyle = ["#1a1640", "#120f2e", "#0a0820"][k]; ctx.beginPath(); ctx.moveTo(-60, H);
        for (const [x, y] of pts) ctx.lineTo(x - mx * (10 + k * 20), y - my * (4 + k * 6));
        ctx.lineTo(W + 60, H); ctx.fill();
      });
      if (Math.random() < dt * (env.small ? 0.5 : 0.9) && list.length < (env.small ? 30 : 60)) spawn();
      list.sort((a, b) => a.s - b.s);
      for (const l of list) {
        const dx = l.x - mouse.x, dy = l.y - mouse.y, d2 = dx * dx + dy * dy, R = 140 * l.s + 40;
        if (mouse.active && d2 < R * R) { const d = Math.sqrt(d2) || 1, f = (1 - d / R) * 220; l.vx += (dx / d) * f * dt; l.vy += (dy / d) * f * dt; }
        l.vx += Math.sin(t * 0.5 + l.ph) * 3 * dt; l.vx *= 0.96; l.vy *= 0.96;
        l.x += l.vx * dt * 10; l.y += (l.vy * 10 - 18 * l.rise * (0.6 + l.s)) * dt;
        draw(l, t);
      }
      list = list.filter((l) => l.y > -80);
    },
  };
};

/* ───────────── Koi pond: koi swim around and follow your cursor, tap makes ripples ───────────── */
type Pt = { x: number; y: number };
type Fish = { pts: Pt[]; a: number; len: number; n: number; sp: number; base: string; spot: string; spots: { i: number; off: number; r: number }[]; wob: number; tx: number; ty: number; goal: number };
const KOI_COLORS: [string, string][] = [["#fff4ea", "#ff5a2a"], ["#ffffff", "#e8322a"], ["#ffb347", "#1b1b1b"], ["#f5f5f5", "#ff8c1a"], ["#ffd2a8", "#ffffff"]];
export const koi: SceneMaker = (env) => {
  const { ctx } = env;
  let fish: Fish[] = [], ripples: { x: number; y: number; r: number; small?: boolean }[] = [];
  let pads: { x: number; y: number; r: number; a: number; flower: boolean }[] = [];
  let petals: { x: number; y: number; a: number; s: number; v: number }[] = [];
  const width = (i: number, n: number, L: number) => { const u = i / (n - 1); return L * 0.13 * Math.sin((u * 0.82 + 0.1) * Math.PI) * (1 - u * 0.45) + L * 0.008; };
  function makeFish(): Fish {
    const n = 18, len = rand(95, 150) * (env.small ? 0.8 : 1), [base, spot] = pick(KOI_COLORS);
    const x = rand(0, env.W), y = rand(0, env.H), a = rand(0, TAU);
    return {
      pts: Array.from({ length: n }, (_, i) => ({ x: x - (Math.cos(a) * i * len) / n, y: y - (Math.sin(a) * i * len) / n })),
      a, len, n, sp: rand(38, 60), base, spot, wob: rand(0, TAU), tx: rand(0, env.W), ty: rand(0, env.H), goal: 0,
      spots: Array.from({ length: 5 }, () => ({ i: rand(2, n - 5), off: rand(-0.6, 0.6), r: rand(0.35, 0.75) })),
    };
  }
  function outline(f: Fish) {
    const left: [number, number][] = [], right: [number, number][] = [];
    for (let i = 0; i < f.n; i++) {
      const a = f.pts[Math.max(0, i - 1)], b = f.pts[Math.min(f.n - 1, i + 1)], ang = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2, w = width(i, f.n, f.len);
      left.push([f.pts[i].x + Math.cos(ang) * w, f.pts[i].y + Math.sin(ang) * w]);
      right.push([f.pts[i].x - Math.cos(ang) * w, f.pts[i].y - Math.sin(ang) * w]);
    }
    ctx.beginPath();
    left.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    for (let i = f.n - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
    ctx.closePath();
    return { left, right };
  }
  function drawFish(f: Fish, t: number) {
    const { pts, n, len: L } = f;
    ctx.save(); ctx.translate(8, 12); ctx.fillStyle = "rgba(0,20,30,.25)"; outline(f); ctx.fill(); ctx.restore();
    const tail = pts[n - 1], pre = pts[n - 3], ta = Math.atan2(tail.y - pre.y, tail.x - pre.x), flick = Math.sin(t * 6 + f.wob) * 0.5;
    ctx.fillStyle = f.base; ctx.globalAlpha = 0.75; ctx.beginPath(); ctx.moveTo(tail.x, tail.y);
    const tp = (da: number, r: number) => [tail.x + Math.cos(ta + da + flick) * L * r, tail.y + Math.sin(ta + da + flick) * L * r] as const;
    ctx.quadraticCurveTo(...tp(0.9, 0.35), ...tp(0.35, 0.32)); ctx.lineTo(...tp(-0.35, 0.32)); ctx.quadraticCurveTo(...tp(-0.9, 0.35), tail.x, tail.y); ctx.fill();
    const fin = pts[4], fa = Math.atan2(pts[3].y - pts[5].y, pts[3].x - pts[5].x), fw = Math.sin(t * 4 + f.wob) * 0.3;
    for (const sgn of [1, -1]) { ctx.beginPath(); ctx.ellipse(fin.x + Math.cos(fa + sgn * 1.9) * L * 0.12, fin.y + Math.sin(fa + sgn * 1.9) * L * 0.12, L * 0.12, L * 0.05, fa + sgn * (2.3 + fw), 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.save(); const { left, right } = outline(f); ctx.fillStyle = f.base; ctx.fill(); ctx.clip();
    ctx.fillStyle = f.spot;
    for (const s of f.spots) { const p = pts[s.i | 0], w = width(s.i | 0, n, L); ctx.beginPath(); ctx.arc(p.x + s.off * w * 0.6, p.y + s.off * w * 0.3, w * s.r * 1.4, 0, TAU); ctx.fill(); }
    const sh = ctx.createLinearGradient(left[3][0], left[3][1], right[3][0], right[3][1]);
    sh.addColorStop(0, "rgba(255,255,255,.35)"); sh.addColorStop(0.5, "rgba(255,255,255,0)"); sh.addColorStop(1, "rgba(0,0,0,.18)");
    ctx.fillStyle = sh; ctx.fillRect(-env.W, -env.H, env.W * 3, env.H * 3); ctx.restore();
    const h = pts[0], ha = Math.atan2(pts[0].y - pts[2].y, pts[0].x - pts[2].x);
    ctx.fillStyle = "#111";
    for (const sgn of [1, -1]) { ctx.beginPath(); ctx.arc(h.x + Math.cos(ha + sgn * 1.2) * L * 0.07 - Math.cos(ha) * L * 0.03, h.y + Math.sin(ha + sgn * 1.2) * L * 0.07 - Math.sin(ha) * L * 0.03, L * 0.014, 0, TAU); ctx.fill(); }
  }
  return {
    init() {
      const { W, H } = env;
      fish = Array.from({ length: Math.max(5, Math.min(12, Math.round((W * H) / 110000))) }, makeFish);
      ripples = [];
      pads = Array.from({ length: Math.max(4, Math.round(W / 220)) }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(26, 54), a: rand(0, TAU), flower: Math.random() < 0.4 }));
      petals = Array.from({ length: 20 }, () => ({ x: rand(0, W), y: rand(0, H), a: rand(0, TAU), s: rand(4, 7), v: rand(0.2, 0.6) }));
    },
    click(x, y) {
      ripples.push({ x, y, r: 0 });
      for (const f of fish) if (Math.hypot(f.pts[0].x - x, f.pts[0].y - y) < 380) { f.tx = x; f.ty = y; f.goal = 2.5; }
    },
    frame(t, dt) {
      const { W, H, mouse } = env;
      const g = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.8);
      g.addColorStop(0, "#0f5a63"); g.addColorStop(0.6, "#0a3a46"); g.addColorStop(1, "#06212c");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 7; i++) glow(ctx, (Math.sin(t * 0.13 + i * 1.7) * 0.5 + 0.5) * W, (Math.cos(t * 0.11 + i * 2.3) * 0.5 + 0.5) * H, 260, "rgba(120,220,210,.07)");
      ctx.globalCompositeOperation = "source-over";
      if (mouse.active && Math.hypot(mouse.x - mouse.px, mouse.y - mouse.py) > 4 && Math.random() < 0.25) ripples.push({ x: mouse.x, y: mouse.y, r: 0, small: true });
      for (const f of fish) {
        const h = f.pts[0];
        if (f.goal > 0) f.goal -= dt;
        else if (mouse.active && Math.hypot(mouse.x - h.x, mouse.y - h.y) < 320) { f.tx = mouse.x + Math.sin(t + f.wob) * 40; f.ty = mouse.y + Math.cos(t * 1.3 + f.wob) * 40; }
        else if (Math.hypot(f.tx - h.x, f.ty - h.y) < 60) { f.tx = rand(40, W - 40); f.ty = rand(40, H - 40); }
        let da = Math.atan2(f.ty - h.y, f.tx - h.x) - f.a; da = Math.atan2(Math.sin(da), Math.cos(da));
        f.a += Math.max(-2.2 * dt, Math.min(2.2 * dt, da)) + (dt ? Math.sin(t * 3 + f.wob) * 0.01 : 0);
        const sp = f.sp * (f.goal > 0 ? 2 : 1);
        h.x += Math.cos(f.a) * sp * dt; h.y += Math.sin(f.a) * sp * dt;
        const seg = f.len / f.n;
        for (let i = 1; i < f.n; i++) { const a = f.pts[i - 1], b = f.pts[i], d = Math.hypot(b.x - a.x, b.y - a.y) || 1; b.x = a.x + ((b.x - a.x) / d) * seg; b.y = a.y + ((b.y - a.y) / d) * seg; }
        drawFish(f, t);
      }
      for (const r of ripples) {
        r.r += dt * (r.small ? 50 : 110);
        const a = Math.max(0, 1 - r.r / (r.small ? 60 : 220));
        ctx.strokeStyle = `rgba(200,250,255,${a * 0.5})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
        if (!r.small) { ctx.beginPath(); ctx.arc(r.x, r.y, r.r * 0.6, 0, TAU); ctx.stroke(); }
      }
      ripples = ripples.filter((r) => r.r < (r.small ? 60 : 220));
      for (const p of pads) {
        ctx.save(); ctx.translate(p.x, p.y + Math.sin(t * 0.6 + p.a) * 2); ctx.rotate(p.a + Math.sin(t * 0.2 + p.a) * 0.05);
        ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.arc(6, 8, p.r, 0.25, TAU - 0.25); ctx.lineTo(6, 8); ctx.fill();
        const lg = ctx.createRadialGradient(-p.r * 0.3, -p.r * 0.3, 0, 0, 0, p.r); lg.addColorStop(0, "#7fc25a"); lg.addColorStop(1, "#2f7a3a");
        ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(0, 0, p.r, 0.25, TAU - 0.25); ctx.lineTo(0, 0); ctx.fill();
        if (p.flower) {
          for (let k = 0; k < 8; k++) { ctx.fillStyle = k % 2 ? "#ffd1e1" : "#ffadc9"; ctx.beginPath(); ctx.ellipse(Math.cos((k * TAU) / 8) * 8, Math.sin((k * TAU) / 8) * 8, 10, 5, (k * TAU) / 8, 0, TAU); ctx.fill(); }
          ctx.fillStyle = "#ffd75a"; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
        }
        ctx.restore();
      }
      ctx.fillStyle = "rgba(255,190,215,.85)";
      for (const p of petals) {
        p.x += Math.cos(t * 0.3 + p.a) * p.v * dt * 60; p.y += p.v * 0.6 * dt * 60;
        if (p.y > H + 10) { p.y = -10; p.x = rand(0, W); }
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.s, p.s * 0.55, p.a + t * 0.4, 0, TAU); ctx.fill();
      }
    },
  };
};

/* ───────────── Wind chimes: strands of Japanese letters hang from a beam and swing as you pass ───────────── */
const KANA = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん夢花星光風空月雪桜".split("");
type Node = { x: number; y: number; ox: number; oy: number; g: string };
export const chimes: SceneMaker = (env) => {
  const { ctx } = env;
  let strands: { hue: number; nodes: Node[]; seg: number; bell: boolean }[] = [];
  return {
    init() {
      const { W } = env;
      const cols = Math.max(7, Math.round(W / 72)), gap = W / cols, top = 70;
      strands = Array.from({ length: cols }, (_, c) => {
        const n = 8 + (((Math.sin(c * 1.7) * 0.5 + 0.5) * 10) | 0), x = gap * (c + 0.5), seg = 26;
        return { hue: [28, 340, 200, 45, 280][c % 5], seg, bell: c % 2 === 0, nodes: Array.from({ length: n }, (_, i) => ({ x, y: top + i * seg, ox: x, oy: top + i * seg, g: pick(KANA) })) };
      });
    },
    click(x, y) { for (const s of strands) for (const n of s.nodes) { const d = Math.hypot(n.x - x, n.y - y) || 1; if (d < 220) n.ox -= ((x - n.x) / d) * 18; } },
    frame(t, dt) {
      const { W, H, mouse } = env;
      vgrad(env, [[0, "#1e1036"], [0.6, "#3a1d4f"], [1, "#7a3a5a"]]);
      glow(ctx, W * 0.5, H * 1.05, H * 0.9, "rgba(255,170,120,.35)");
      ctx.fillStyle = "#2a1a14"; ctx.fillRect(0, 54, W, 14); ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.fillRect(0, 54, W, 3);
      const wind = (Math.sin(t * 0.4) * 0.5 + Math.sin(t * 1.1) * 0.2) * 14;
      const mvx = mouse.x - mouse.px, mvy = mouse.y - mouse.py;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (const s of strands) {
        const N = s.nodes;
        if (dt > 0) {
          for (let i = 1; i < N.length; i++) {
            const n = N[i], vx = (n.x - n.ox) * 0.985, vy = (n.y - n.oy) * 0.985;
            n.ox = n.x; n.oy = n.y; n.x += vx + wind * dt * dt * 9 * (i / N.length); n.y += vy + 900 * dt * dt;
            const d = Math.hypot(n.x - mouse.x, n.y - mouse.y);
            if (mouse.active && d < 40) { n.x += mvx * 0.35 * (1 - d / 40); n.y += mvy * 0.2 * (1 - d / 40); }
          }
          for (let k = 0; k < 4; k++) for (let i = 1; i < N.length; i++) {
            const a = N[i - 1], b = N[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, diff = (d - s.seg) / d;
            if (i === 1) { b.x -= dx * diff; b.y -= dy * diff; } else { a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5; }
          }
        }
        ctx.strokeStyle = "rgba(255,230,210,.35)"; ctx.lineWidth = 1; ctx.beginPath();
        N.forEach((n, i) => (i ? ctx.lineTo(n.x, n.y) : ctx.moveTo(n.x, n.y))); ctx.stroke();
        N.forEach((n, i) => {
          if (i === 0) return;
          const speed = Math.hypot(n.x - n.ox, n.y - n.oy), light = Math.min(1, 0.55 + speed * 0.25);
          ctx.font = `600 ${15 + (i % 3) * 3}px "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", "Noto Sans JP", serif`;
          ctx.shadowColor = `hsla(${s.hue},90%,70%,${light})`; ctx.shadowBlur = 8 + speed * 6;
          ctx.fillStyle = `hsla(${s.hue},85%,${78 + speed * 4}%,${light})`; ctx.fillText(n.g, n.x, n.y);
        });
        ctx.shadowBlur = 0;
        const last = N[N.length - 1];
        if (s.bell) { ctx.fillStyle = `hsl(${s.hue},70%,62%)`; ctx.beginPath(); ctx.moveTo(last.x - 9, last.y + 22); ctx.quadraticCurveTo(last.x, last.y + 2, last.x + 9, last.y + 22); ctx.fill(); }
        else { ctx.fillStyle = "rgba(255,240,220,.85)"; ctx.beginPath(); ctx.arc(last.x, last.y + 14, 4, 0, TAU); ctx.fill(); }
      }
    },
  };
};

/* ───────────── Fireflies: a dark garden, fireflies gather around your cursor, tap scatters them ───────────── */
export const fireflies: SceneMaker = (env) => {
  const { ctx } = env;
  let flies: { x: number; y: number; vx: number; vy: number; ph: number; sp: number; s: number }[] = [];
  let grass: { x: number; h: number; ph: number; c: string }[] = [];
  return {
    init() {
      const { W, H } = env;
      flies = Array.from({ length: Math.max(40, Math.min(140, Math.round((W * H) / 14000))) }, () => ({ x: rand(0, W), y: rand(0, H), vx: 0, vy: 0, ph: rand(0, TAU), sp: rand(0.6, 1.6), s: rand(1.2, 2.8) }));
      grass = Array.from({ length: Math.round(W / 5) }, (_, i) => ({ x: i * 5 + rand(-3, 3), h: rand(30, 120), ph: rand(0, TAU), c: Math.random() < 0.5 ? "#0b1f1a" : "#0f2a20" }));
    },
    click(x, y) { for (const f of flies) { const dx = f.x - x, dy = f.y - y, d = Math.hypot(dx, dy) || 1; if (d < 260) { f.vx += (dx / d) * 260; f.vy += (dy / d) * 260; } } },
    frame(t, dt) {
      const { W, H, mouse } = env;
      vgrad(env, [[0, "#030a12"], [0.7, "#071a1e"], [1, "#0b2620"]]);
      glow(ctx, W * 0.8, H * 0.18, 220, "rgba(220,240,255,.25)");
      ctx.fillStyle = "#eef6ff"; ctx.beginPath(); ctx.arc(W * 0.8, H * 0.18, 26, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = "lighter";
      for (const f of flies) {
        if (mouse.active) {
          const dx = mouse.x - f.x, dy = mouse.y - f.y, d = Math.hypot(dx, dy) || 1;
          if (d < 300) { f.vx += (dx / d) * 40 * dt * f.sp; f.vy += (dy / d) * 40 * dt * f.sp; if (d < 50) { f.vx -= (dx / d) * 60 * dt; f.vy -= (dy / d) * 60 * dt; } }
        }
        f.vx += Math.cos(t * f.sp + f.ph) * 12 * dt; f.vy += Math.sin(t * f.sp * 1.3 + f.ph) * 12 * dt;
        f.vx *= 0.97; f.vy *= 0.97; f.x += f.vx * dt; f.y += f.vy * dt;
        if (f.x < -20) f.x = W + 20; if (f.x > W + 20) f.x = -20; if (f.y < -20) f.y = H + 20; if (f.y > H + 20) f.y = -20;
        const a = Math.max(0, Math.sin(t * 2 * f.sp + f.ph)) ** 2;
        glow(ctx, f.x, f.y, f.s * 9, `rgba(220,255,140,${0.9 * a + 0.05})`, "rgba(120,255,80,0)");
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.lineWidth = 3;
      for (const b of grass) {
        let lean = Math.sin(t * 1.2 + b.ph) * 6;
        if (mouse.active) { const d = b.x - mouse.x; if (Math.abs(d) < 90 && mouse.y > H - b.h - 60) lean += Math.sign(d) * (90 - Math.abs(d)) * 0.4; }
        ctx.strokeStyle = b.c; ctx.beginPath(); ctx.moveTo(b.x, H); ctx.quadraticCurveTo(b.x + lean * 0.3, H - b.h * 0.5, b.x + lean, H - b.h); ctx.stroke();
      }
    },
  };
};
