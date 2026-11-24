// Apple Watch / Apple Health data.
// Apple has no web API for Health, so an iPhone Shortcut (runs by itself every night) reads today's numbers
// and sends them to /api/apple-health. That writes one row per day into the "Health" tab of the Life sheet,
// which this file reads back for the Health page and the 7 AM Telegram recap. See APPLE-WATCH.md.
import { config, lifeIsDemo } from "./config";
import { addDays, daysBetween, parseDate, todayISO } from "./dates";
import { dailyShuffle } from "./hype";
import { appendRow, appendRowCreatingTab, ensureTab, num, readSheet, readSheetRows, str, updateRow } from "./google";

export type Workout = { type: string; minutes: number };
export type HealthDay = {
  date: string;
  steps: number | null;
  distanceKm: number | null;
  activeKcal: number | null;
  exerciseMin: number | null;
  restingHr: number | null;
  avgHr: number | null;
  minHr: number | null;
  maxHr: number | null;
  workouts: Workout[];
  syncedAt: string;
};

export const HEALTH_TAB = "Health";
export const WORKOUT_TAB = "Workouts";
export const WORKOUT_HEADERS = ["Date", "Type", "Minutes", "Notes"];
/** One-tap choices on the Glow Up tab. */
export const WORKOUT_CHOICES = ["Strength", "Cardio", "HIIT", "Yoga", "Pilates", "Run", "Walk", "Dance"];
export const HEALTH_HEADERS = ["Date", "Steps", "Distance (km)", "Active (kcal)", "Exercise (min)", "Resting HR", "Avg HR", "Min HR", "Max HR", "Workouts", "Workout (min)", "Synced At"];

const r1 = (n: number) => Math.round(n * 10) / 10;
/** A number from whatever the Shortcut sends ("8,432", "352.7 kcal", "72 count/min"). Empty → null. */
export function looseNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s || !/\d/.test(s)) return null;
  const n = num(s.split(/\s*\n\s*/)[0]);
  return isFinite(n) ? n : null;
}

/** Workout length in minutes from "45 min", "1 hr 5 min", "0:45:12", "45:12" or a plain number (seconds if big, else minutes). */
export function parseMinutes(v: unknown): number {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return 0;
  const hms = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (hms) return hms[3] !== undefined ? Number(hms[1]) * 60 + Number(hms[2]) + Number(hms[3]) / 60 : Number(hms[1]) + Number(hms[2]) / 60;
  if (/[a-z]/.test(s)) {
    const part = (re: RegExp) => { const m = s.match(re); return m ? parseFloat(m[1].replace(",", ".")) : 0; };
    const h = part(/([\d.,]+)\s*(?:h|hr|hrs|hour|hours)\b/), m = part(/([\d.,]+)\s*(?:m|min|mins|minute|minutes)\b/), sec = part(/([\d.,]+)\s*(?:s|sec|secs|second|seconds)\b/);
    if (h || m || sec) return h * 60 + m + sec / 60;
  }
  const n = parseFloat(s.replace(/,/g, ""));
  if (!isFinite(n)) return 0;
  return n > 300 ? n / 60 : n; // the Shortcut's "Duration" is usually seconds
}

/** "HKWorkoutActivityTypeTraditionalStrengthTraining" / "traditionalStrengthTraining" → "Traditional Strength Training". */
export function prettyWorkout(t: string): string {
  let s = str(t).replace(/^HKWorkoutActivityType/i, "").replace(/^Workout:?\s*/i, "");
  if (!/\s/.test(s)) s = s.replace(/([a-z])([A-Z])/g, "$1 $2");
  s = s.trim();
  return s ? s[0].toUpperCase() + s.slice(1) : "Workout";
}

/** Workouts as the Shortcut sends them: one per line, "Type|Duration". Also accepts a JSON list of {type, minutes|duration}. */
export function parseWorkouts(v: unknown): Workout[] {
  if (Array.isArray(v)) {
    return v.map((w) => (typeof w === "object" && w ? { type: prettyWorkout(String((w as Record<string, unknown>).type ?? "Workout")), minutes: r1(parseMinutes((w as Record<string, unknown>).minutes ?? (w as Record<string, unknown>).duration)) } : parseLine(String(w))))
      .filter((w): w is Workout => !!w);
  }
  return String(v ?? "").split(/\n|;/).map(parseLine).filter((w): w is Workout => !!w);
}
function parseLine(line: string): Workout | null {
  const l = line.trim();
  if (!l) return null;
  const [type, dur] = l.includes("|") ? l.split("|") : [l.replace(/[\d:.,]+\s*(h|hr|hrs|min|mins|minutes|s|sec)?\b.*$/i, ""), (l.match(/[\d:.,]+\s*(h|hr|hrs|min|mins|minutes|s|sec)?.*$/i) || [""])[0]];
  return { type: prettyWorkout(type || "Workout"), minutes: r1(parseMinutes(dur)) };
}
/** How workouts are stored in the sheet: "Traditional Strength Training 45 min; Outdoor Walk 20 min". */
const workoutsToCell = (ws: Workout[]) => ws.map((w) => `${w.type} ${Math.round(w.minutes)} min`).join("; ");
const cellToWorkouts = (s: string) => s.split(";").map((x) => x.trim()).filter(Boolean).map((x) => {
  const m = x.match(/^(.*?)\s+([\d.]+)\s*min$/i);
  return m ? { type: m[1], minutes: Number(m[2]) } : { type: x, minutes: 0 };
});

/** Walks don't count as a gym session. */
export const isGymWorkout = (w: Workout) => w.minutes >= 15 && !/walk|hik/i.test(w.type);

// ───── Reading ─────
export async function loadHealth(): Promise<{ demo: boolean; days: HealthDay[] }> {
  if (lifeIsDemo()) return { demo: true, days: demoDays() };
  const rows = await readSheet(config.google.lifeSheetId, HEALTH_TAB).catch((e) => {
    if (/misnamed|parse range/i.test(String(e))) return [];
    throw e;
  });
  const n = (v: unknown) => (str(v) === "" ? null : num(v));
  const days = rows.map((r): HealthDay => ({
    date: parseDate(r["date"]) || "",
    steps: n(r["steps"]), distanceKm: n(r["distance (km)"] ?? r["distance"]), activeKcal: n(r["active (kcal)"] ?? r["active"]),
    exerciseMin: n(r["exercise (min)"] ?? r["exercise"]), restingHr: n(r["resting hr"]), avgHr: n(r["avg hr"]), minHr: n(r["min hr"]), maxHr: n(r["max hr"]),
    workouts: cellToWorkouts(str(r["workouts"])), syncedAt: str(r["synced at"]),
  })).filter((d) => d.date);
  // If a date somehow appears twice, keep the last one.
  const map = new Map(days.map((d) => [d.date, d]));
  // Workouts you log by hand on the Glow Up tab (iPhone Shortcuts can't read workouts on every iPhone).
  const manual = await readSheet(config.google.lifeSheetId, WORKOUT_TAB).catch(() => []);
  for (const r of manual) {
    const date = parseDate(r["date"]); const type = str(r["type"]);
    if (!date || !type) continue;
    const day = map.get(date) || { date, steps: null, distanceKm: null, activeKcal: null, exerciseMin: null, restingHr: null, avgHr: null, minHr: null, maxHr: null, workouts: [], syncedAt: "" };
    day.workouts = [...day.workouts, { type, minutes: num(r["minutes"]) }];
    map.set(date, day);
  }
  return { demo: false, days: [...map.values()].sort((a, b) => a.date.localeCompare(b.date)) };
}

// ───── Saving (called by /api/apple-health) ─────
export type HealthInput = Omit<HealthDay, "syncedAt">;

/** Keys as the Shortcut sent them, made forgiving: "Steps ", "HR_Avg", "hr avg" all work. */
export function normaliseBody(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = k.trim().toLowerCase().replace(/[\s-]+/g, "_");
    out[key] = Array.isArray(v) ? (v.length === 1 ? v[0] : v) : v;
  }
  return out;
}

export function inputFromBody(raw: Record<string, unknown>): HealthInput {
  const b = normaliseBody(raw);
  const pick = (...keys: string[]) => { for (const k of keys.map((x) => x.toLowerCase())) if (b[k] !== undefined && str(b[k]) !== "") return b[k]; return undefined; };
  let distance = looseNum(pick("distance", "distance_km", "distanceKm"));
  if (distance !== null && /\bmi\b|mile/i.test(String(pick("distance", "distance_km") ?? ""))) distance = distance * 1.609;
  if (distance !== null && distance > 200) distance = distance / 1000; // sent in metres
  const date = parseDate(pick("date")) || todayISO();
  const round = (v: number | null, d = 0) => (v === null ? null : d ? r1(v) : Math.round(v));
  return {
    date,
    steps: round(looseNum(pick("steps"))),
    distanceKm: round(distance, 1),
    activeKcal: round(looseNum(pick("active", "active_kcal", "activeEnergy", "move"))),
    exerciseMin: round(looseNum(pick("exercise", "exercise_min", "exerciseMinutes"))),
    restingHr: round(looseNum(pick("resting", "resting_hr", "restingHr"))),
    avgHr: round(looseNum(pick("hr_avg", "avg_hr", "heart_rate", "bpm"))),
    minHr: round(looseNum(pick("hr_min", "min_hr"))),
    maxHr: round(looseNum(pick("hr_max", "max_hr"))),
    workouts: parseWorkouts(pick("workouts") ?? ""),
  };
}

/** Writes (or overwrites) that day's row, so running the Shortcut twice in a day is fine. */
export async function saveHealthDay(d: HealthInput): Promise<"added" | "updated"> {
  const sheet = config.google.lifeSheetId;
  await ensureTab(sheet, HEALTH_TAB, HEALTH_HEADERS);
  const now = new Intl.DateTimeFormat("en-GB", { timeZone: config.timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date());
  const v = (x: number | null) => (x === null ? "" : x);
  const row = [d.date, v(d.steps), v(d.distanceKm), v(d.activeKcal), v(d.exerciseMin), v(d.restingHr), v(d.avgHr), v(d.minHr), v(d.maxHr),
    workoutsToCell(d.workouts), d.workouts.length ? Math.round(d.workouts.reduce((s, w) => s + w.minutes, 0)) : "", now];
  const rows = await readSheetRows(sheet, HEALTH_TAB);
  const existing = rows.find((r) => parseDate(r["date"]) === d.date);
  if (existing) {
    await updateRow(sheet, HEALTH_TAB, Number(existing.__row), Object.fromEntries(HEALTH_HEADERS.map((h, i) => [h, row[i]])));
    return "updated";
  }
  await appendRow(sheet, HEALTH_TAB, row);
  return "added";
}

/** Ticks "gym" in the Habits tab when the watch saw a real workout (not just a walk) or 30+ exercise minutes. Skips if it's already ticked. */
export async function tickGymFromWatch(d: HealthInput): Promise<boolean> {
  const gym = d.workouts.filter(isGymWorkout);
  const exOk = (d.exerciseMin ?? 0) >= config.gymExerciseMin;
  if (!gym.length && !exOk) return false;
  const note = gym.length ? gym.map((w) => `${w.type} ${Math.round(w.minutes)} min`).join(", ") : `${d.exerciseMin} exercise min`;
  return tickGym(d.date, `⌚ ${note}`);
}

async function tickGym(date: string, note: string): Promise<boolean> {
  const rows = await readSheet(config.google.lifeSheetId, "Habits").catch(() => []);
  const already = rows.some((r) => parseDate(r["date"]) === date && /^(y|yes|true|1|✓|✔|done|x)$/i.test(str(r["gym"])));
  if (already) return false;
  await appendRow(config.google.lifeSheetId, "Habits", [date, "", "", "yes", note]);
  return true;
}

/** Saves a workout you logged by hand (Workouts tab, made automatically) and ticks gym if it counts. */
export async function logManualWorkout(date: string, type: string, minutes: number, notes = ""): Promise<boolean> {
  await appendRowCreatingTab(config.google.lifeSheetId, WORKOUT_TAB, WORKOUT_HEADERS, [date, type, minutes, notes]);
  return isGymWorkout({ type, minutes }) ? tickGym(date, `🏋️‍♀️ ${type} ${minutes} min`).catch(() => false) : false;
}

// ───── Analysis ─────
export function analyseHealth(days: HealthDay[], today = todayISO()) {
  const get = (d: string) => days.find((x) => x.date === d);
  const last30 = Array.from({ length: 30 }, (_, i) => { const date = addDays(today, i - 29); return get(date) || null; });
  const withSteps = days.filter((d) => d.steps !== null);
  const avg = (xs: (number | null | undefined)[]) => { const v = xs.filter((x): x is number => typeof x === "number" && x > 0); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const inRange = (from: string, to: string) => days.filter((d) => d.date >= from && d.date <= to);
  const week = inRange(addDays(today, -6), today), prevWeek = inRange(addDays(today, -13), addDays(today, -7));
  const month = inRange(addDays(today, -29), today);
  const latest = days.length ? days[days.length - 1] : null;
  const yesterday = get(addDays(today, -1)) || null;
  let goalStreak = 0;
  for (let d = (get(today)?.steps ?? 0) >= config.stepGoal ? today : addDays(today, -1); (get(d)?.steps ?? 0) >= config.stepGoal && goalStreak < 400; d = addDays(d, -1)) goalStreak++;
  const best = withSteps.length ? withSteps.reduce((a, b) => ((b.steps ?? 0) > (a.steps ?? 0) ? b : a)) : null;
  const recentWorkouts = [...days].reverse().filter((d) => d.date > addDays(today, -15)).flatMap((d) => d.workouts.map((w) => ({ ...w, date: d.date })));
  return {
    latest, yesterday, today: get(today) || null, last30,
    daysSinceSync: latest ? daysBetween(latest.date, today) : null,
    avgSteps7: avg(week.map((d) => d.steps)), avgStepsPrev7: avg(prevWeek.map((d) => d.steps)), avgSteps30: avg(month.map((d) => d.steps)),
    stepsWeek: week.reduce((s, d) => s + (d.steps ?? 0), 0),
    kmWeek: r1(week.reduce((s, d) => s + (d.distanceKm ?? 0), 0)),
    workoutsWeek: week.reduce((s, d) => s + d.workouts.length, 0),
    workoutMinWeek: Math.round(week.reduce((s, d) => s + d.workouts.reduce((x, w) => x + w.minutes, 0), 0)),
    restingAvg7: avg(week.map((d) => d.restingHr)), restingAvg30: avg(month.map((d) => d.restingHr)),
    goalStreak, best, recentWorkouts,
  };
}
export type HealthAnalysis = ReturnType<typeof analyseHealth>;

/** Bestie-style lines for the Health page, built from real numbers. Changes every day. */
export function healthHype(a: HealthAnalysis, date = todayISO()): string[] {
  const n = config.ownerName;
  const out: string[] = [];
  const d = a.yesterday ?? a.latest;
  const g = config.stepGoal;
  const k = (x: number) => Math.round(x).toLocaleString("en-US");
  if (a.daysSinceSync !== null && a.daysSinceSync >= 2) out.push(`👟 No steps logged for ${a.daysSinceSync} days. Peek at your watch and pop the number in, babe.`);
  if (d?.steps != null) {
    if (d.steps >= g * 1.5) out.push(`${k(d.steps)} steps?? ${n}, that's not walking, that's a whole PILGRIMAGE 👟🔥`);
    else if (d.steps >= g) out.push(`${k(d.steps)} steps. Goal: eaten. Plate: clean. Legs: iconic 💅`);
    else if (d.steps >= g * 0.6) out.push(`${k(d.steps)} steps, only ${k(g - d.steps)} short. One evening walk and you'd have had it, just saying 😏`);
    else out.push(`${k(d.steps)} steps… bestie, the couch is not a personality. ${k(g - d.steps)} more today, deal? 🛋️➡️🚶‍♀️`);
  }
  if (a.goalStreak >= 3) out.push(`🔥 ${a.goalStreak} days in a row over ${k(g)} steps. Break it and I'm telling everyone.`);
  if (a.avgSteps7 && a.avgStepsPrev7) {
    const diff = a.avgSteps7 - a.avgStepsPrev7;
    out.push(diff >= 0 ? `📈 You're averaging ${k(a.avgSteps7)} steps a day, ${k(diff)} more than last week. Glow-up is measurable 📊` : `📉 ${k(a.avgSteps7)} steps a day this week vs ${k(a.avgStepsPrev7)} last week. We're not going backwards, ma'am.`);
  }
  if (a.workoutsWeek >= 3) out.push(`🏋️‍♀️ ${a.workoutsWeek} workouts (${a.workoutMinWeek} min) this week. Gym girlie era confirmed.`);
  else if (a.workoutsWeek === 0 && a.latest) out.push(`🏋️‍♀️ Zero workouts logged this week. The dumbbells are getting lonely. Give them something.`);
  else if (a.workoutsWeek > 0) out.push(`🏋️‍♀️ ${a.workoutsWeek} workout${a.workoutsWeek > 1 ? "s" : ""} so far this week. ${3 - a.workoutsWeek} more for the gym streak 👀`);
  if (a.restingAvg7 && a.restingAvg30 && a.restingAvg7 < a.restingAvg30 - 1) out.push(`❤️ Resting heart rate down to ${Math.round(a.restingAvg7)} bpm (month avg ${Math.round(a.restingAvg30)}). Your heart is literally getting fitter. Cardio queen 👑`);
  if (a.best?.steps) out.push(`🏆 Personal best: ${k(a.best.steps)} steps. Coming for that record? 😤`);
  return dailyShuffle(out, date + "health").slice(0, 4);
}

// ───── Sample data (until the Life sheet + Shortcut are connected) ─────
function demoDays(): HealthDay[] {
  let seed = 7; const r = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const t = todayISO(); const out: HealthDay[] = [];
  const types = ["Traditional Strength Training", "Outdoor Walk", "Yoga", "High Intensity Interval Training", "Elliptical"];
  for (let i = 40; i >= 1; i--) {
    const steps = i === 1 ? 15420 : Math.round(4000 + r() * 9000 + (40 - i) * 40);
    const workouts: Workout[] = r() < 0.5 ? [{ type: types[Math.floor(r() * types.length)], minutes: Math.round(20 + r() * 40) }] : [];
    out.push({
      date: addDays(t, -i), steps, distanceKm: r1(steps * 0.00072), activeKcal: Math.round(180 + r() * 380), exerciseMin: Math.round(8 + r() * 50 + workouts.length * 20),
      restingHr: i === 3 ? 77 : Math.round(68 - (40 - i) * 0.06 + r() * 4), avgHr: Math.round(80 + r() * 10), minHr: Math.round(55 + r() * 6), maxHr: Math.round(130 + r() * 40), workouts, syncedAt: "",
    });
  }
  return out;
}

// ───── Heart-rate check (not medical advice: a nudge to notice patterns) ─────
export type HeartFlag = { date: string; level: "warn" | "watch"; title: string; detail: string };
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0; };

/** Looks at the last 14 days for heart-rate numbers that are unusual for you (or unusual in general). */
export function heartFlags(days: HealthDay[], today = todayISO()): { flags: HeartFlag[]; baseline: number | null; checked: number } {
  const recent = days.filter((d) => d.date > addDays(today, -14) && d.date <= today);
  const maxSafe = config.age ? 220 - config.age : 190;
  const flags: HeartFlag[] = [];
  let baseline: number | null = null;
  for (const d of recent) {
    const before = days.filter((x) => x.date < d.date && x.date >= addDays(d.date, -30) && x.restingHr).map((x) => x.restingHr as number);
    const base = before.length >= 5 ? median(before) : null;
    if (base) baseline = Math.round(base);
    const r = d.restingHr;
    if (r !== null && r > 100) flags.push({ date: d.date, level: "warn", title: `Resting heart rate ${r} bpm`, detail: "That's above 100 bpm at rest. If you see this again, tell a doctor." });
    else if (r !== null && r < 40) flags.push({ date: d.date, level: "warn", title: `Resting heart rate ${r} bpm`, detail: "That's below 40 bpm. Fine for pro athletes, worth asking a doctor about otherwise." });
    else if (r !== null && base && r >= base + 8) flags.push({ date: d.date, level: "watch", title: `Resting heart rate ${r} bpm (usual ~${Math.round(base)})`, detail: "Higher than normal for you. Common reasons: bad sleep, stress, caffeine, a hard workout the day before, or getting sick. Rest up and drink water." });
    const workedOut = d.workouts.some((w) => w.minutes >= 10);
    if (d.maxHr !== null && d.maxHr > maxSafe && !workedOut) flags.push({ date: d.date, level: "watch", title: `Heart rate spiked to ${d.maxHr} bpm`, detail: "No workout was logged that day. A quick sprint for the bus counts, but if you felt dizzy or your heart was racing at rest, note it down." });
    if (d.minHr !== null && d.minHr < 38) flags.push({ date: d.date, level: "watch", title: `Heart rate dipped to ${d.minHr} bpm`, detail: "Very low reading (often during deep sleep). Only a worry if you felt faint or tired." });
  }
  return { flags: flags.sort((a, b) => b.date.localeCompare(a.date)), baseline, checked: recent.filter((d) => d.restingHr || d.maxHr).length };
}

// ───── Workout summary + what to train next ─────
export type WorkoutKind = "Strength" | "Cardio" | "Mobility" | "Walking";
export const KIND_ICON: Record<WorkoutKind, string> = { Strength: "🏋️‍♀️", Cardio: "🔥", Mobility: "🧘‍♀️", Walking: "🚶‍♀️" };
export function workoutKind(type: string): WorkoutKind {
  if (/walk|hik/i.test(type)) return "Walking";
  if (/yoga|pilates|stretch|flexib|mind|barre|cool ?down|tai chi/i.test(type)) return "Mobility";
  if (/strength|weight|functional|core|crossfit|lift|resistance/i.test(type)) return "Strength";
  return "Cardio";
}

/** Weekly targets for fat loss + shape: 2-3 strength days, ~150 min cardio (walks count), 1 stretch/yoga. */
export const WEEK_TARGET = { Strength: 3, Cardio: 150, Mobility: 1 } as const;

export function workoutPlan(days: HealthDay[], today = todayISO()) {
  const all = days.flatMap((d) => d.workouts.map((w) => ({ ...w, date: d.date, kind: workoutKind(w.type) })));
  const week = all.filter((w) => w.date > addDays(today, -7) && w.date <= today);
  const month = all.filter((w) => w.date > addDays(today, -28) && w.date <= today);
  const kinds: WorkoutKind[] = ["Strength", "Cardio", "Mobility", "Walking"];
  const sum = (ws: typeof all, k: WorkoutKind) => ({ n: ws.filter((w) => w.kind === k).length, min: Math.round(ws.filter((w) => w.kind === k).reduce((s, w) => s + w.minutes, 0)) });
  const byKind = kinds.map((k) => {
    const last = [...all].reverse().find((w) => w.kind === k);
    return { kind: k, icon: KIND_ICON[k], week: sum(week, k), month: sum(month, k), daysSince: last ? daysBetween(last.date, today) : null };
  });
  const get = (k: WorkoutKind) => byKind.find((x) => x.kind === k)!;
  const cardioMin = get("Cardio").week.min + Math.round(get("Walking").week.min * 0.5);
  const progress = {
    Strength: get("Strength").week.n / WEEK_TARGET.Strength,
    Cardio: cardioMin / WEEK_TARGET.Cardio,
    Mobility: get("Mobility").week.n / WEEK_TARGET.Mobility,
  };
  const types = new Map<string, { n: number; min: number }>();
  for (const w of month) { const t = types.get(w.type) || { n: 0, min: 0 }; types.set(w.type, { n: t.n + 1, min: t.min + w.minutes }); }
  const topTypes = [...types.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 5).map(([type, v]) => ({ type, n: v.n, min: Math.round(v.min) }));

  // What next: the area furthest behind this week, but never the same thing you did yesterday if something else is behind too.
  const yesterdayKinds = new Set(all.filter((w) => w.date === addDays(today, -1) || w.date === today).map((w) => w.kind));
  const order = (Object.keys(progress) as (keyof typeof progress)[]).sort((a, b) => progress[a] - progress[b]);
  const behind = order.filter((k) => progress[k] < 1);
  const focus = behind.find((k) => !yesterdayKinds.has(k)) ?? behind[0] ?? null;
  const s = get("Strength").daysSince, c = get("Cardio").daysSince;
  const since = (n: number | null) => (n === null ? "you haven't logged one yet" : n === 0 ? "you did one today" : `last one was ${n} day${n === 1 ? "" : "s"} ago`);
  const IDEAS: Record<keyof typeof progress, { title: string; how: string; why: string }> = {
    Strength: { title: "Strength day 🏋️‍♀️", how: "30–40 min full body: squats, glute bridges / hip thrusts, lunges, push-ups (knees are fine), dumbbell rows, plank. 3 rounds of 10–12.", why: `Muscle is what burns fat while you sleep and gives the snatched shape the scale can't show. ${since(s)}.` },
    Cardio: { title: "Cardio day 🔥", how: "30–40 min: incline walk, cycling, elliptical or dance. Short on time? 20 min HIIT (30 s hard, 30 s easy).", why: `You're at ${cardioMin} of ${WEEK_TARGET.Cardio} cardio minutes this week (walks count half). ${since(c)}.` },
    Mobility: { title: "Stretch / yoga day 🧘‍♀️", how: "20–30 min yoga or a stretch flow: hips, hamstrings, back. Then tap Yoga above to log it.", why: "Keeps you injury-free and less sore so you can keep showing up. Your hips will write you a thank-you note." },
  };
  let next: { title: string; how: string; why: string };
  if (focus) next = IDEAS[focus];
  else if (yesterdayKinds.size) next = { title: "Active rest day 😌", how: "Easy 30-min walk + stretching. Recovery is part of the plan.", why: "You hit every target this week. That's elite behaviour, rest is earned." };
  else next = IDEAS[order[0]];
  const alsoNote = get("Walking").week.n >= 4 && get("Strength").week.n === 0 ? "Lots of walking but zero strength this week. Walking burns, lifting SHAPES. Add one." : null;
  return { byKind, week: week.length, weekMin: Math.round(week.reduce((s, w) => s + w.minutes, 0)), month: month.length, cardioMin, progress, topTypes, focus, next, alsoNote };
}

// ───── Manual step logging (Glow Up tab) ─────
/** Saves the day's step count in the Health tab: updates that date's row, or adds one. */
export async function saveSteps(date: string, steps: number) {
  const sheet = config.google.lifeSheetId;
  await ensureTab(sheet, HEALTH_TAB, HEALTH_HEADERS);
  const now = new Intl.DateTimeFormat("en-GB", { timeZone: config.timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date());
  const rows = await readSheetRows(sheet, HEALTH_TAB);
  const existing = rows.find((r) => parseDate(r["date"]) === date);
  if (existing) return updateRow(sheet, HEALTH_TAB, Number(existing.__row), { Steps: steps, "Synced At": now });
  return appendRow(sheet, HEALTH_TAB, [date, steps, "", "", "", "", "", "", "", "", "", now]);
}

/** This month's steps, day by day, plus how it compares. */
export function stepMonth(days: HealthDay[], today = todayISO()) {
  const month = today.slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const get = (d: string) => days.find((x) => x.date === d)?.steps ?? null;
  const list = Array.from({ length: dim }, (_, i) => { const date = `${month}-${String(i + 1).padStart(2, "0")}`; return { date, steps: date <= today ? get(date) : null }; });
  const logged = list.filter((d) => d.steps !== null && d.steps > 0) as { date: string; steps: number }[];
  const prevMonth = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const prev = days.filter((d) => d.date.startsWith(prevMonth) && (d.steps ?? 0) > 0);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const best = logged.length ? logged.reduce((a, b) => (b.steps > a.steps ? b : a)) : null;
  return {
    list, logged: logged.length, total: logged.reduce((s, d) => s + d.steps, 0),
    avg: avg(logged.map((d) => d.steps)), prevAvg: avg(prev.map((d) => d.steps ?? 0)),
    goalDays: logged.filter((d) => d.steps >= config.stepGoal).length, best,
    monthName: new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" }),
  };
}

/** Should the Glow Up tab throw a party? Looks at today, or yesterday if today isn't logged yet. */
export function stepParty(days: HealthDay[], today = todayISO()): { date: string; steps: number; kind: "goal" | "huge" } | null {
  const pick = days.find((d) => d.date === today && (d.steps ?? 0) > 0) ?? days.find((d) => d.date === addDays(today, -1) && (d.steps ?? 0) > 0);
  if (!pick || pick.steps === null) return null;
  const before = days.filter((d) => d.date < pick.date && d.date >= addDays(pick.date, -30) && (d.steps ?? 0) > 0).map((d) => d.steps as number);
  const usual = before.length >= 5 ? before.reduce((a, b) => a + b, 0) / before.length : null;
  if (usual && pick.steps >= usual * 1.4 && pick.steps >= config.stepGoal * 0.8) return { date: pick.date, steps: pick.steps, kind: "huge" };
  if (pick.steps >= config.stepGoal) return { date: pick.date, steps: pick.steps, kind: "goal" };
  return null;
}
