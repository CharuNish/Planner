// Weight, habits, mini goals, cooking log and saved opportunities all live in one "Life" Google Sheet.
import { config, lifeIsDemo } from "./config";
import { addDays, daysBetween, parseDate, todayISO } from "./dates";
import { num, readSheet, readSheetRows, str } from "./google";

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

// ───── Body measurements (cm) ─────
export const MEASURES = ["chest", "waist", "belly", "hip", "arms", "thigh"] as const;
export type Measure = (typeof MEASURES)[number];
export type MeasureEntry = { date: string } & Record<Measure, number>;
export const MEASURE_LABEL: Record<Measure, string> = { chest: "Chest", waist: "Waist", belly: "Belly", hip: "Hip", arms: "Arms", thigh: "Thigh" };

export async function loadMeasurements(): Promise<{ demo: boolean; entries: MeasureEntry[] }> {
  if (lifeIsDemo()) {
    const t = todayISO();
    const base = { chest: 96, waist: 82, belly: 94, hip: 106, arms: 31, thigh: 62 };
    const entries = [84, 56, 28, 0].map((ago, i) => ({ date: addDays(t, -ago), chest: base.chest - i * 1.2, waist: base.waist - i * 1.8, belly: base.belly - i * 2.2, hip: base.hip - i * 1.5, arms: base.arms - i * 0.5, thigh: base.thigh - i * 1 }));
    return { demo: true, entries };
  }
  const rows = await tab("Measurements");
  const pickNum = (r: Record<string, unknown>, k: string) => {
    const key = Object.keys(r).find((h) => h.startsWith(k) || (k === "hip" && h.startsWith("hips")) || (k === "arms" && h.startsWith("arm")));
    return key ? num(r[key]) : 0;
  };
  const entries = rows.map((r) => ({ date: parseDate(r["date"]) || "", ...Object.fromEntries(MEASURES.map((m) => [m, pickNum(r, m)])) }) as MeasureEntry)
    .filter((e) => e.date && MEASURES.some((m) => e[m] > 0)).sort((a, b) => a.date.localeCompare(b.date));
  // Carry forward a measurement you skipped, so a blank cell doesn't look like 0 cm.
  for (let i = 1; i < entries.length; i++) for (const m of MEASURES) if (!entries[i][m]) entries[i][m] = entries[i - 1][m];
  for (let i = entries.length - 2; i >= 0; i--) for (const m of MEASURES) if (!entries[i][m]) entries[i][m] = entries[i + 1][m];
  return { demo: false, entries };
}

export function analyseMeasurements(entries: MeasureEntry[]) {
  if (!entries.length) return null;
  const first = entries[0], latest = entries[entries.length - 1];
  const prev = entries.length > 1 ? entries[entries.length - 2] : null;
  const change = Object.fromEntries(MEASURES.map((m) => [m, Math.round((latest[m] - first[m]) * 10) / 10])) as Record<Measure, number>;
  const sincePrev = prev ? (Object.fromEntries(MEASURES.map((m) => [m, Math.round((latest[m] - prev[m]) * 10) / 10])) as Record<Measure, number>) : null;
  const totalLost = Math.round(MEASURES.reduce((s, m) => s + Math.max(0, first[m] - latest[m]), 0) * 10) / 10;
  const best = MEASURES.reduce((b, m) => (change[m] < change[b] ? m : b), MEASURES[0]);
  return { first, latest, prev, change, sincePrev, totalLost, best, days: daysBetween(first.date, latest.date), daysSinceLast: daysBetween(latest.date, todayISO()) };
}

// ───── Settings you can change from the website (stored in a "Settings" tab, last value wins) ─────
export async function loadSettings(): Promise<Record<string, { value: string; label: string }>> {
  if (lifeIsDemo()) return {};
  const rows = await tab("Settings").catch(() => []);
  const out: Record<string, { value: string; label: string }> = {};
  for (const r of rows) { const k = str(r["setting"]).toLowerCase(); if (k) out[k] = { value: parseDate(r["value"]) || str(r["value"]), label: str(r["label"]) }; }
  return out;
}

export async function getCountdown(): Promise<{ date: string; label: string }> {
  const s = await loadSettings().catch(() => ({} as Record<string, { value: string; label: string }>));
  const c = s["countdown"];
  if (c?.value && /^\d{4}-\d{2}-\d{2}$/.test(c.value)) return { date: c.value, label: c.label || "Countdown" };
  return { date: process.env.COUNTDOWN_DATE || "2027-01-01", label: process.env.COUNTDOWN_LABEL || "New Year 2027 🎆" };
}

// ───── Wins (special / good things you did each day) ─────
// "Wins" tab in the Life sheet: Date | Win | Category | Photo. The Wins page adds rows (and creates the tab the first time).
export type Win = { date: string; text: string; category: string; photo: string; row: number };
export const WIN_HEADERS = ["Date", "Win", "Category", "Photo"];
export const WIN_CATEGORIES: { key: string; icon: string }[] = [
  { key: "Fitness", icon: "🏃‍♀️" }, { key: "Mind", icon: "🧘‍♀️" }, { key: "Kindness", icon: "💝" }, { key: "Learning", icon: "🧠" },
  { key: "Career", icon: "💼" }, { key: "Fun", icon: "🎉" }, { key: "Self-care", icon: "🛁" }, { key: "Other", icon: "✨" },
];
export const winIcon = (c: string) => WIN_CATEGORIES.find((x) => x.key.toLowerCase() === c.toLowerCase())?.icon || "✨";
export async function loadWins(): Promise<{ demo: boolean; items: Win[] }> {
  if (lifeIsDemo()) {
    const t = todayISO();
    const d = [
      [0, "Walked 10,412 steps 👟", "Fitness"], [-1, "Held a yoga headstand for 20 seconds!!", "Mind"], [-1, "Volunteered at the animal shelter", "Kindness"],
      [-2, "Prof said my figure was the clearest in the class", "Learning"], [-4, "Cooked air fryer chickpeas and they slapped", "Fun"], [-6, "First 5K run without stopping", "Fitness"],
    ] as const;
    return { demo: true, items: d.map(([o, text, category], i) => ({ date: addDays(t, o), text, category, photo: "", row: i + 2 })) };
  }
  const rows = await tab("Wins").catch(() => []);
  return {
    demo: false,
    items: rows.map((r, i) => ({ date: parseDate(r["date"]) || "", text: str(r["win"] ?? r["highlight"]), category: str(r["category"]) || "Other", photo: str(r["photo"]), row: i + 2 }))
      .filter((w) => w.date && w.text).sort((a, b) => b.date.localeCompare(a.date) || b.row - a.row),
  };
}

export function analyseWins(items: Win[], today = todayISO()) {
  const days = new Set(items.map((w) => w.date));
  let streak = 0; let d = days.has(today) ? today : addDays(today, -1);
  while (days.has(d) && streak < 1000) { streak++; d = addDays(d, -1); }
  const inLast = (n: number) => items.filter((w) => daysBetween(w.date, today) < n && w.date <= today).length;
  const byCat = WIN_CATEGORIES.map((c) => ({ ...c, n: items.filter((w) => (w.category || "Other").toLowerCase() === c.key.toLowerCase()).length })).filter((c) => c.n);
  return { total: items.length, week: inLast(7), month: inLast(30), streak, today: items.filter((w) => w.date === today).length, byCat, photos: items.filter((w) => w.photo).length };
}

// ───── To-dos (non-study things: edit the vlog, buy a gift…) ─────
// "Todos" tab in the Life sheet: Added | Task | Priority | Done | Done On. The Home page adds rows (and creates the tab the first time).
// Ticking a to-do writes "Yes" in Done, so it disappears from Home but stays in the sheet as a record.
export type Todo = { task: string; priority: "High" | "Medium" | "Low"; added: string; row: number };
export const TODO_HEADERS = ["Added", "Task", "Priority", "Done", "Done On"];
export const TODO_PRIORITIES = ["High", "Medium", "Low"] as const;
const PRIO_RANK: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
export const toPriority = (v: unknown): Todo["priority"] => {
  const s = str(v).toLowerCase();
  return s.startsWith("h") ? "High" : s.startsWith("l") ? "Low" : "Medium";
};
/** High first, then Medium, then Low. Inside the same priority, the oldest one comes first. */
export const sortTodos = (items: Todo[]) => [...items].sort((a, b) => PRIO_RANK[a.priority] - PRIO_RANK[b.priority] || a.added.localeCompare(b.added) || a.row - b.row);

export async function loadTodos(): Promise<{ demo: boolean; items: Todo[] }> {
  if (lifeIsDemo()) {
    const t = todayISO();
    const d: [number, string, Todo["priority"]][] = [[-3, "Buy a birthday gift for Amma", "Medium"], [-2, "Reply to the brand email", "Low"], [0, "Edit the new vlog 🎬", "High"]];
    return { demo: true, items: sortTodos(d.map(([o, task, priority], i) => ({ task, priority, added: addDays(t, o), row: i + 2 }))) };
  }
  // readSheetRows keeps each row's real sheet row number, so ticking updates the right row even with blank rows in between.
  const rows = await readSheetRows(config.google.lifeSheetId, "Todos").catch(() => []);
  return {
    demo: false,
    items: sortTodos(rows.map((r) => ({ task: str(r["task"] ?? r["to-do"] ?? r["todo"]), priority: toPriority(r["priority"]), added: parseDate(r["added"]) || "", done: yes(r["done"]), row: Number(r.__row) }))
      .filter((x) => x.task && !x.done).map((x) => ({ task: x.task, priority: x.priority, added: x.added, row: x.row }))),
  };
}

// ───── Birthdays ─────
// "Birthdays" tab in the Life sheet: Name | Birthday | Year Born | Note.
// Why a sheet? Google keeps birthdays private to you: they don't show up for anyone you share your calendar with,
// and that includes the planner's robot account. So the planner reads birthdays from here instead.
// Birthday can be any date (only the day and month are used). Year Born is optional and is used to say "turns 27".
export type Birthday = { name: string; month: number; day: number; year: number | null; note: string };
export const BIRTHDAY_HEADERS = ["Name", "Birthday", "Year Born", "Note"];
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Reads a day + month (and a year if it's clearly a real birth year) from a sheet cell. */
export function parseBirthday(v: unknown): { month: number; day: number; year: number | null } | null {
  if (v === null || v === undefined || v === "") return null;
  const thisYear = Number(todayISO().slice(0, 4));
  const fromIso = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return m >= 1 && m <= 12 && d >= 1 && d <= 31 ? { month: m, day: d, year: y < thisYear - 1 ? y : null } : null;
  };
  if (typeof v === "number") return fromIso(parseDate(v) || "");
  const s = String(v).trim().toLowerCase();
  // "14 May", "14th of May", "May 14"
  let m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s+)?([a-z]{3})[a-z]*\.?,?\s*(\d{4})?$/);
  if (m && MONTHS.includes(m[2])) return { day: Number(m[1]), month: MONTHS.indexOf(m[2]) + 1, year: m[3] && Number(m[3]) < thisYear - 1 ? Number(m[3]) : null };
  m = s.match(/^([a-z]{3})[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?$/);
  if (m && MONTHS.includes(m[1])) return { day: Number(m[2]), month: MONTHS.indexOf(m[1]) + 1, year: m[3] && Number(m[3]) < thisYear - 1 ? Number(m[3]) : null };
  // "14/05" or "14-05" (day first, no year)
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})$/);
  if (m && Number(m[2]) <= 12) return { day: Number(m[1]), month: Number(m[2]), year: null };
  return fromIso(parseDate(v) || "");
}

export async function loadBirthdays(): Promise<{ demo: boolean; items: Birthday[] }> {
  if (lifeIsDemo()) {
    const t = todayISO();
    const d = (o: number) => addDays(t, o);
    return {
      demo: true,
      items: [["Amma", d(9), 1968], ["Nethmi", d(23), null], ["Kasun", d(61), 1999]].map(([name, iso, year]) => {
        const [, m, dd] = String(iso).split("-").map(Number);
        return { name: String(name), month: m, day: dd, year: year as number | null, note: "" };
      }),
    };
  }
  const rows = await tab("Birthdays");
  return {
    demo: false,
    items: rows.map((r) => {
      const b = parseBirthday(r["birthday"] ?? r["date"] ?? r["birth date"] ?? r["dob"]);
      const born = num(r["year born"] ?? r["year"]);
      return b ? { name: str(r["name"]), month: b.month, day: b.day, year: born > 1900 ? born : b.year, note: str(r["note"] ?? r["notes"]) } : null;
    }).filter((b): b is Birthday => !!b && !!b.name),
  };
}

/** The next time this birthday comes round (today counts), how many days away, and the age they turn (if we know the year). */
export function nextBirthday(b: Birthday, today = todayISO()) {
  let year = Number(today.slice(0, 4));
  const iso = (y: number) => {
    // 29 Feb birthdays are celebrated on 28 Feb in non-leap years.
    const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    const day = b.month === 2 && b.day === 29 && !leap ? 28 : b.day;
    return `${y}-${String(b.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };
  if (iso(year) < today) year++;
  const date = iso(year);
  return { date, days: daysBetween(today, date), turning: b.year ? year - b.year : null };
}
