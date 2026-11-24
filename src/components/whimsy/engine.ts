/* Shared bits for the interactive canvas backgrounds (src/components/whimsy-background.tsx). */

export type Mouse = { x: number; y: number; px: number; py: number; active: boolean };

/** What every scene gets: the canvas, its size in CSS pixels, the cursor, and whether it's a small screen. */
export type Env = { ctx: CanvasRenderingContext2D; W: number; H: number; mouse: Mouse; small: boolean };

export type Scene = {
  /** (Re)build everything that depends on the screen size. */
  init(): void;
  /** Draw one frame. t = seconds since start, dt = seconds since last frame (0 when motion is reduced). */
  frame(t: number, dt: number): void;
  /** A click or tap on empty background. */
  click?(x: number, y: number): void;
};

export type SceneMaker = (env: Env) => Scene;

export const TAU = Math.PI * 2;
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const pick = <T,>(arr: T[]) => arr[(Math.random() * arr.length) | 0];

/** Fill the whole canvas with a vertical gradient. */
export function vgrad(env: Env, stops: [number, string][]) {
  const { ctx, W, H } = env;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** Soft round glow. */
export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, inner: string, outer = "rgba(0,0,0,0)") {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Cursor offset from centre, -0.5..0.5 (drifts gently by itself when there's no cursor, e.g. phones). */
export function sway(env: Env, t: number) {
  const { mouse, W, H } = env;
  return mouse.active ? { mx: mouse.x / W - 0.5, my: mouse.y / H - 0.5 } : { mx: Math.sin(t * 0.2) * 0.2, my: Math.cos(t * 0.15) * 0.1 };
}

/** Blurry clouds painted once onto their own canvas. */
export function cloudLayer(W: number, H: number, n: number, color: () => string, yMin: number, yMax: number) {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d")!;
  x.filter = "blur(30px)";
  for (let i = 0; i < n; i++) {
    x.fillStyle = color();
    x.beginPath();
    x.ellipse(rand(-100, W + 100), rand(H * yMin, H * yMax), rand(150, 380), rand(30, 70), 0, 0, TAU);
    x.fill();
  }
  return c;
}
