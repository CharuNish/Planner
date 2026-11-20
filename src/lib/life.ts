// Weight, habits, mini goals, cooking log and saved opportunities all live in one "Life" Google Sheet.
import { config, lifeIsDemo } from "./config";
import { addDays, daysBetween, parseDate, todayISO } from "./dates";
import { num, readSheet, str } from "./google";

export type WeightEntry = { date: string; kg: number; notes: string };
export type HabitDay = { date: string; sleep: number | null; water: number | null; gym: boolean | null; notes: string };
export type Goal = { goal: string; category: string; image: string; targetDate: string; status: string; progress: number; notes: string; cost: number };
export type CookLog = { date: string; recipe: string; link: string; rating: number; comment: string };
export type SavedOpp = { title: string; type: string; org: string; deadline: string; link: string; status: string; notes: string };

const tab = (name: string) => readSheet(config.google.lifeSheetId, name).catch((e) => {
  if (String(e).includes("misnamed") || String(e).includes("parse range")) return [];
  throw e;
});
const yes = (v: unknown) => /^(y|yes|true|1|✓|✔|done|x)$/i.test(str(v));

function rng(seed: number) { return () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296); }

// ───── Weight ─────
export async function loadWeight(): Promise<{ demo: boolean; entries: WeightEntry[] }> {
  if (lifeIsDemo()) {
    const r = rng(3); const t = todayISO(); const entries: WeightEntry[] = [];
    let kg = 78.4;
    for (let i = 90; i >= 0; i -= 2 + Math.floor(r() * 3)) { kg += -0.12 + (r() - 0.5) * 0.6; entries.push({ date: addDays(t, -i), kg: Math.round(kg * 10) / 10, notes: "" }); }
    return { demo: true, entries };
  }
  const rows = await tab("Weight");
  return { demo: false, entries: rows.map((r) => ({ date: parseDate(r["date"]) || "", kg: num(r["weight (kg)"] ?? r["weight"] ?? r["kg"]), notes: str(r["notes"]) })).filter((e) => e.date && e.kg > 0).sort((a, b) => a.date.localeCompare(b.date)) };
}

export function analyseWeight(entries: WeightEntry[]) {
  const today = todayISO();
  if (!entries.length) return null;
  const start = entries[0], current = entries[entries.length - 1];
  const lowest = entries.reduce((m, e) => (e.kg < m.kg ? e : m), entries[0]);
  // Trend: best-fit line through the last 30 days (kg per week).
  const recent = entries.filter((e) => daysBetween(e.date, today) <= 30);
  let perWeek = 0;
  if (recent.length >= 3) {
    const xs = recent.map((e) => daysBetween(recent[0].date, e.date)), ys = recent.map((e) => e.kg);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / Math.max(1e-9, xs.reduce((a, x) => a + (x - mx) ** 2, 0));
    perWeek = slope * 7;
  }
  const goal = config.weightGoalKg;
  const toGo = goal ? current.kg - goal : 0;
  const etaWeeks = goal && perWeek < -0.05 && toGo > 0 ? toGo / -perWeek : null;
  const bmi = config.heightCm ? current.kg / (config.heightCm / 100) ** 2 : null;
  const chart = entries.map((e, i) => {
    const win = entries.slice(Math.max(0, i - 3), i + 1);
    return { date: e.date, label: e.date.slice(8, 10) + "/" + e.date.slice(5, 7), kg: e.kg, avg: Math.round((win.reduce((a, w) => a + w.kg, 0) / win.length) * 10) / 10, goal: goal || null };
  });
  const mood: "losing" | "steady" | "gaining" = perWeek < -0.1 ? "losing" : perWeek > 0.15 ? "gaining" : "steady";
  return { start, current, lowest, lost: Math.round((start.kg - current.kg) * 10) / 10, perWeek, goal, toGo, etaWeeks, bmi, chart, mood, daysSinceLast: daysBetween(current.date, today) };
}

const CHEERS = {
  losing: [
    "Look at you go! Every little bit you've lost is proof you can do hard things. 🌟",
    "Your consistency is paying off. Be proud, you're doing amazing! 💜",
    "Slow and steady really does win. Your future self is cheering for you! 🎉",
    "You're not just losing weight, you're building habits that last. Keep shining! ✨",
  ],
  steady: [
    "Plateaus are normal. Your body is catching up with all your hard work. Keep going! 🌱",
    "No change this week? That's okay. Showing up matters more than the number. 💪",
    "Progress isn't always on the scale. Notice how you feel, sleep and move. 🌈",
    "Be kind to yourself today. One good meal and a short walk is a win. 🍃",
  ],
  gaining: [
    "A small bump doesn't erase your progress. Tomorrow is a fresh start! 🌅",
    "Weight goes up and down with water, salt and stress. Don't let one number define you. 💜",
    "You've done this before and you can do it again. One healthy choice at a time. 🌸",
    "Be gentle with yourself. Drink some water, get good sleep, and keep going. 💧",
  ],
};
export function cheer(mood: keyof typeof CHEERS, dateISO: string) {
  const list = CHEERS[mood];
  return list[Number(dateISO.slice(8, 10)) % list.length];
}

// ───── Habits ─────
export async function loadHabits(): Promise<{ demo: boolean; days: HabitDay[] }> {
  if (lifeIsDemo()) {
    const r = rng(11); const t = todayISO();
    return { demo: true, days: Array.from({ length: 40 }, (_, i) => ({ date: addDays(t, i - 40), sleep: Math.round((5.5 + r() * 3) * 2) / 2, water: Math.floor(4 + r() * 6), gym: r() < 0.55, notes: "" })) };
  }
  const rows = await tab("Habits");
  const map = new Map<string, HabitDay>();
  for (const r of rows) {
    const date = parseDate(r["date"]); if (!date) continue;
    const prev = map.get(date) || { date, sleep: null, water: null, gym: null, notes: "" };
    const sleep = str(r["sleep (h)"] ?? r["sleep"]); const water = str(r["water (glasses)"] ?? r["water"]); const gym = str(r["gym"]);
    map.set(date, { date, sleep: sleep ? num(sleep) : prev.sleep, water: water ? num(water) : prev.water, gym: gym ? yes(gym) : prev.gym, notes: str(r["notes"]) || prev.notes });
  }
  return { demo: false, days: [...map.values()].sort((a, b) => a.date.localeCompare(b.date)) };
}

export function analyseHabits(days: HabitDay[]) {
  const today = todayISO();
  const get = (d: string) => days.find((x) => x.date === d);
  const last30 = Array.from({ length: 30 }, (_, i) => { const date = addDays(today, i - 29); return get(date) || { date, sleep: null, water: null, gym: null, notes: "" }; });
  const streak = (ok: (d: HabitDay | undefined) => boolean) => {
    let n = 0; let d = ok(get(today)) ? today : addDays(today, -1);
    while (ok(get(d)) && n < 400) { n++; d = addDays(d, -1); }
    return n;
  };
  const sleepOk = (d?: HabitDay) => !!d && d.sleep !== null && d.sleep >= config.sleepTarget;
  const waterOk = (d?: HabitDay) => !!d && d.water !== null && d.water >= config.waterTarget;
  const dow = (new Date(today + "T12:00:00Z").getUTCDay() + 6) % 7;
  const weekStart = addDays(today, -dow);
  const gymThisWeek = days.filter((d) => d.date >= weekStart && d.date <= today && d.gym).length;
  // Gym streak = weeks in a row with at least 3 sessions
  let gymWeeks = 0;
  for (let w = gymThisWeek >= 3 ? 0 : 1; w < 52; w++) {
    const s = addDays(weekStart, -7 * w), e = addDays(s, 6);
    if (days.filter((d) => d.date >= s && d.date <= e && d.gym).length >= 3) gymWeeks++; else break;
  }
  const logged = last30.filter((d) => d.sleep !== null || d.water !== null || d.gym !== null);
  const avg = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x !== null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };
  return {
    today: get(today), last30, sleepStreak: streak(sleepOk), waterStreak: streak(waterOk), gymThisWeek, gymWeeks,
    avgSleep: avg(last30.slice(-7).map((d) => d.sleep)), avgWater: avg(last30.slice(-7).map((d) => d.water)),
    gym30: last30.filter((d) => d.gym).length, loggedDays: logged.length,
  };
}

// ───── Goals ─────
export async function loadGoals(): Promise<{ demo: boolean; goals: Goal[] }> {
  if (lifeIsDemo()) {
    const g = (goal: string, category: string, status: string, progress = 0, targetDate = "", cost = 0, notes = "") => ({ goal, category, image: "", targetDate, status, progress, notes, cost });
    return { demo: true, goals: [
      g("Publish my first XAI paper", "Career", "In progress", 35, "2027-06-30"), g("Get into a funded PhD", "Career", "Planning", 10, "2027-09-01"),
      g("Visit Japan in cherry blossom season", "Travel", "Dream", 0, "2028-04-01", 650000), g("See the Northern Lights in Norway", "Travel", "Dream"),
      g("MacBook Pro for editing", "Buy", "Saving", 60, "2027-03-01", 750000), g("Good mirrorless camera", "Buy", "Dream", 20, "", 400000),
      g("Learn Japanese (JLPT N5)", "Learn", "In progress", 25), g("Learn to swim properly", "Learn", "Planning", 0),
    ] };
  }
  const rows = await tab("Goals");
  return { demo: false, goals: rows.map((r) => ({
    goal: str(r["goal"]), category: str(r["category"]) || "Other", image: str(r["image url"] ?? r["image"]), targetDate: parseDate(r["target date"]) || "",
    status: str(r["status"]) || "Dream", progress: Math.max(0, Math.min(100, num(r["progress (%)"] ?? r["progress"]))), notes: str(r["notes"]), cost: num(r["cost"]),
  })).filter((g) => g.goal) };
}

// ───── Cooking log ─────
export async function loadCookLog(): Promise<{ demo: boolean; log: CookLog[] }> {
  if (lifeIsDemo()) return { demo: true, log: [{ date: addDays(todayISO(), -4), recipe: "Chicken Congee", link: "", rating: 4, comment: "Made it in the rice cooker on porridge mode, so easy! Needed more ginger." }] };
  const rows = await tab("RecipeLog");
  return { demo: false, log: rows.map((r) => ({ date: parseDate(r["date"]) || "", recipe: str(r["recipe"]), link: str(r["link"]), rating: num(r["rating"]), comment: str(r["comment"]) })).filter((l) => l.recipe).reverse() };
}

// ───── Saved opportunities ─────
export async function loadSavedOpps(): Promise<{ demo: boolean; saved: SavedOpp[] }> {
  if (lifeIsDemo()) return { demo: true, saved: [] };
  const rows = await tab("Opportunities");
  return { demo: false, saved: rows.map((r) => ({ title: str(r["title"]), type: str(r["type"]), org: str(r["organisation"] ?? r["org"]), deadline: parseDate(r["deadline"]) || "", link: str(r["link"]), status: str(r["status"]) || "Interested", notes: str(r["notes"]) })).filter((s) => s.title) };
}
