// The Telegram "bestie bot" schedule: morning recap, midday deadline check, evening check-in and night recap.
// The times are fixed here in SLOTS (Sri Lanka time). Vercel calls /api/cron/tick once around each time
// (see vercel.json, free plan = "sometime within that hour"); each call sends whatever is due.
// Every message (or skip) is written to a "BotLog" tab so nothing is sent twice.
// Evening and night messages use NO Gemini (the free quota is kept for the morning message).
import { loadEvents, type CalEvent } from "./calendar";
import { config, lifeIsDemo } from "./config";
import { addDays, daysBetween, todayISO } from "./dates";
import { fmt, loadFinance, upcomingBills } from "./finance";
import { appendRowCreatingTab, readSheet, str } from "./google";
import { analyseHealth, loadHealth } from "./health";
import { dailyShuffle } from "./hype";
import { isWin, loadHabits, loadWins } from "./life";
import { buildMorningMessage, sendTelegram } from "./morning";
import { hoursLeftToday, studyNudges } from "./nudges";
import { analyseStudies, loadStudies } from "./studies";

export const SLOTS = [
  { key: "morning", label: "☀️ Morning recap", hint: "Yesterday's recap + today's to-do list", def: "07:00" },
  { key: "midday", label: "🚨 Midday deadline check", hint: "Only sends if a deadline or study goal is urgent", def: "13:00" },
  { key: "evening", label: "🌆 Evening check-in", hint: "How today is going + one mission for tonight", def: "18:00" },
  { key: "night", label: "🌙 Night recap", hint: "Today's scoreboard + a peek at tomorrow", def: "21:30" },
] as const;
export type SlotKey = (typeof SLOTS)[number]["key"];
export type BotTime = { key: SlotKey; label: string; hint: string; time: string; on: boolean };
export const BOTLOG_HEADERS = ["Date", "Slot", "Time", "Status"];

/** A slot counts as "due" from EARLY_MIN before its time until WINDOW_MIN after it
 *  (Vercel's free timers fire "sometime within the hour", so this keeps every message within ~30 min of its time). */
const EARLY_MIN = 30;
const WINDOW_MIN = 180;

const toMin = (hm: string) => { const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
/** The current time in your time zone as "HH:MM". */
export function nowHM() {
  const p = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: config.timezone }).formatToParts(new Date());
  const h = p.find((x) => x.type === "hour")?.value || "00", m = p.find((x) => x.type === "minute")?.value || "00";
  return `${h === "24" ? "00" : h}:${m}`;
}
export const pretty = (hm: string) => { const [h, m] = hm.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };

const lifeTab = (name: string) => readSheet(config.google.lifeSheetId, name).catch((e) => {
  if (String(e).includes("misnamed") || String(e).includes("parse range")) return [];
  throw e;
});

/** The bot times (fixed in SLOTS above). To change one, edit SLOTS and the matching line in vercel.json. */
export async function loadBotTimes(): Promise<BotTime[]> {
  return SLOTS.map((s) => ({ key: s.key, label: s.label, hint: s.hint, time: s.def, on: true }));
}

export type LogRow = { date: string; slot: string; time: string; status: string };
export async function loadBotLog(date = todayISO()): Promise<LogRow[]> {
  if (lifeIsDemo()) return [];
  const rows = await lifeTab("BotLog").catch(() => []);
  return rows.map((r) => ({ date: str(r["date"]).replace(/^'/, ""), slot: str(r["slot"]), time: str(r["time"]), status: str(r["status"]) })).filter((r) => r.date === date);
}
async function logSlot(slot: string, status: string) {
  if (lifeIsDemo()) return;
  await appendRowCreatingTab(config.google.lifeSheetId, "BotLog", BOTLOG_HEADERS, [`'${todayISO()}`, slot, `'${nowHM()}`, status]).catch(() => null);
}

/** Which slots should go out right now (time has passed, still inside the window, not done today). */
export function dueSlots(times: BotTime[], doneToday: Set<string>, now = nowHM()): BotTime[] {
  const n = toMin(now);
  return times.filter((t) => t.on && !doneToday.has(t.key) && n >= toMin(t.time) - EARLY_MIN && n - toMin(t.time) < WINDOW_MIN);
}

// ───────── What happened today (shared by evening + night) ─────────
const r1 = (n: number) => Math.round(n * 10) / 10;
const k = (x: number) => (x >= 1000 ? `${(Math.round(x / 100) / 10).toString().replace(/\.0$/, "")}k` : `${Math.round(x)}`);
const isDone = (s: string) => /^(done|finished|complete|yes|✓|true)/i.test(s);

type Today = {
  today: string;
  study: { hours: number; target: number; gap: number } | null;
  urgent: string[]; // deadline-bot lines (fire/warn)
  nextTask: string | null;
  tasksDone: string[];
  steps: number | null; workoutMin: number;
  water: number | null; gym: boolean | null; sleep: number | null;
  spent: number | null; topSpend: string | null;
  wins: string[];
  tomorrow: CalEvent[];
  deadlinesSoon: { title: string; daysLeft: number }[];
  billsTomorrow: string[];
};

async function gatherToday(): Promise<Today> {
  const today = todayISO(), tmr = addDays(today, 1);
  const [cal, stu, hab, fin, hea, wins] = await Promise.all([
    loadEvents(3).catch(() => null),
    loadStudies().then((s) => (s.demo ? null : s)).catch(() => null),
    loadHabits().then((h) => (h.demo ? null : h)).catch(() => null),
    loadFinance().then((f) => (f.demo ? null : f)).catch(() => null),
    loadHealth().then((h) => (h.demo ? null : h)).catch(() => null),
    loadWins().then((w) => (w.demo ? null : w)).catch(() => null),
  ]);
  const events = cal && !cal.demo ? cal.events : [];
  const t: Today = { today, study: null, urgent: [], nextTask: null, tasksDone: [], steps: null, workoutMin: 0, water: null, gym: null, sleep: null, spent: null, topSpend: null, wins: [], tomorrow: events.filter((e) => e.date === tmr), deadlinesSoon: [], billsTomorrow: [] };
  if (stu) {
    const a = analyseStudies(stu.deadlines, stu.tasks, stu.log, stu.targets);
    t.study = { hours: r1(a.hoursToday), target: a.target, gap: r1(Math.max(0, a.target - a.hoursToday)) };
    t.urgent = studyNudges(a, stu.tasks, events).filter((n) => n.level === "fire" || n.level === "warn").map((n) => n.text);
    t.nextTask = a.priorities[0] ? `${a.priorities[0].task}${a.priorities[0].subject ? ` (${a.priorities[0].subject})` : ""}` : null;
    t.tasksDone = stu.tasks.filter((x) => isDone(x.status) && x.doneOn === today).map((x) => x.task);
    t.deadlinesSoon = a.deadlineStatus.filter((d) => d.status !== "Done" && d.daysLeft >= 1 && d.daysLeft <= 3).map((d) => ({ title: d.title, daysLeft: d.daysLeft }));
  }
  if (hab) { const d = hab.days.find((x) => x.date === today); if (d) { t.water = d.water; t.gym = d.gym; t.sleep = d.sleep; } }
  if (hea) {
    const d = analyseHealth(hea.days, today).today;
    if (d) { t.steps = d.steps; t.workoutMin = Math.round(d.workouts.reduce((s, w) => s + w.minutes, 0)); }
  }
  if (fin) {
    const exp = fin.txns.filter((x) => x.date === today && x.type === "Expense");
    t.spent = exp.reduce((s, x) => s + x.amount, 0);
    const top = [...exp].sort((a, b) => b.amount - a.amount)[0];
    t.topSpend = top ? `${top.category || top.description || "something"} ${fmt(top.amount)}` : null;
    t.billsTomorrow = upcomingBills(fin.bills, 1, fin.txns).filter((b) => !b.paid && daysBetween(today, b.due) === 1).map((b) => `${b.name} ${fmt(b.amount)}`);
  }
  if (wins) t.wins = wins.items.filter((w) => w.date === today && isWin(w)).map((w) => w.text);
  return t;
}

const pickFor = (seed: string) => <T,>(list: T[], salt: string) => dailyShuffle(list, seed + salt)[0];

/** 🌆 Evening check-in: how today is going so far, and ONE mission for tonight. */
export function formatEvening(t: Today): string {
  const pick = pickFor(t.today + "eve");
  const n = config.ownerName;
  const left = r1(Math.max(0, hoursLeftToday() - 1.5));
  const L: string[] = [pick([`🌆 Evening check-in, ${n}! Let's see how today's going 👀`, `🌇 Hiii it's me again 💅 Quick evening vibe check, ${n}`, `☕ ${n}! Golden hour check-in. Receipts below 🧾`, `🌆 Bestie bot reporting for evening duty 🫡`], "open"), ""];
  const s = t.study;
  if (s && s.target > 0) {
    if (s.gap <= 0) L.push(pick([`📚 ${s.hours}h studied, goal was ${s.target}h. DONE before dinner?? Iconic 👑`, `📚 Study goal: smashed (${s.hours}/${s.target}h). Nerd queen behaviour 🤓💅`], "s1"));
    else if (s.hours === 0) L.push(pick([`📚 Study so far: 0 out of ${s.target}h. Babe. ${left}h left before bed. We are NOT ending the day on zero 😤`, `📚 Zero hours studied today 👀 Goal is ${s.target}h and you've got ${left}h of awake time left. Clock's ticking ⏰`], "s0"));
    else L.push(pick([`📚 ${s.hours}h of ${s.target}h studied. ${s.gap}h to go, ${left}h left before bed. Very doable 💪`, `📚 You're at ${Math.round((s.hours / s.target) * 100)}% of today's study goal (${s.hours}/${s.target}h). Finish strong 🏁`], "s2"));
  }
  if (t.tasksDone.length) L.push(`✅ Ticked off today: ${t.tasksDone.slice(0, 3).join(", ")}${t.tasksDone.length > 3 ? ` +${t.tasksDone.length - 3} more` : ""}. Love that for you`);
  if (t.steps !== null) L.push(t.steps >= config.stepGoal ? `👟 ${k(t.steps)} steps already. Hot girl walk: ✅` : `👟 ${k(t.steps)} steps so far, ${k(config.stepGoal - t.steps)} to go. Evening walk? 🚶‍♀️`);
  if (t.workoutMin > 0) L.push(`🏋️‍♀️ ${t.workoutMin} min of working out today. The glow-up is loading 🔥`);
  if (t.water !== null) L.push(t.water >= config.waterTarget ? `💧 ${t.water} glasses of water. Hydrated AND hot 💦` : `💧 Only ${t.water}/${config.waterTarget} glasses of water. Go fill that bottle, I'll wait 🥤`);
  if (t.spent !== null) L.push(t.spent > 0 ? `💸 Spent ${fmt(t.spent)} today${t.topSpend ? ` (biggest: ${t.topSpend})` : ""}` : pick([`💸 Nothing spent today. Wallet is THRIVING 💌`, `💸 Zero rupees spent so far. Keep it that way tonight 😌`], "m"));
  for (const w of t.wins.slice(0, 3)) L.push(`✨ Win logged: ${w}. Obsessed.`);
  if (L.length === 2) L.push(pick([`🤷‍♀️ Nothing logged yet today. Either you're too busy being iconic or you forgot. Log something so I can hype you!`, `👀 Your sheets are empty today. Mysterious. Log your study hours / water / spends and I'll do the cheering`], "empty"));
  if (t.urgent.length) L.push("", t.urgent[0].startsWith("🤖") ? t.urgent[0] : `🤖 ${t.urgent[0]}`);

  // ONE concrete mission for tonight.
  let mission: string;
  if (s && s.gap > 0 && left > 0.5) mission = `${Math.min(s.gap, 2) >= 1 ? `${Math.min(s.gap, 2)}h` : "45 minutes"} of study${t.nextTask ? ` on “${t.nextTask}”` : ""}. Start with one 25-min timer.`;
  else if (t.water !== null && t.water < config.waterTarget) mission = `drink ${config.waterTarget - t.water} more glass${config.waterTarget - t.water === 1 ? "" : "es"} of water before bed.`;
  else if (t.steps !== null && t.steps < config.stepGoal) mission = `a 20-minute walk. ${k(config.stepGoal - t.steps)} steps won't walk themselves 👟`;
  else if (t.nextTask) mission = `get a head start on “${t.nextTask}”. Future-you will send flowers 💐`;
  else mission = `rest, glow, and log today's stuff on the dashboard 💆‍♀️`;
  L.push("", `🎯 Tonight's mission: ${mission}`, "", pick(["You've got this, I'm watching 👀💕", "Go go go, text you tonight 😘", "Make tonight count, queen 👑", "Proud of you already. Now move 💅"], "sign"));
  return L.join("\n").slice(0, 4000);
}

/** 🌙 Night recap: today's scoreboard, a peek at tomorrow, and what to log before bed. */
export function formatNight(t: Today): string {
  const pick = pickFor(t.today + "night");
  const n = config.ownerName;
  const L: string[] = [pick([`🌙 Night night recap, ${n}! Here's how you did today 📊`, `✨ Day's almost done, ${n}. Scoreboard time 🏆`, `🌙 Before you doom-scroll in bed… here's your day, bestie 📱❌`, `💤 Final report of the day for Miss ${n} 📋`], "open"), "", "📊 TODAY'S SCOREBOARD"];
  let wins = 0, misses = 0;
  const s = t.study;
  if (s && s.target > 0) {
    if (s.gap <= 0) { wins++; L.push(`📚 Study: ${s.hours}/${s.target}h ✅ goal crushed`); }
    else { misses++; L.push(`📚 Study: ${s.hours}/${s.target}h ${s.hours === 0 ? "❌ zero day (not two in a row, deal?)" : `(${s.gap}h short)`}`); }
  }
  if (t.tasksDone.length) { wins++; L.push(`✅ Tasks done: ${t.tasksDone.length} (${t.tasksDone.slice(0, 3).join(", ")})`); }
  if (t.steps !== null) { if (t.steps >= config.stepGoal) wins++; L.push(`👟 Steps: ${k(t.steps)} ${t.steps >= config.stepGoal ? "✅" : `/ ${k(config.stepGoal)}`}`); }
  if (t.workoutMin > 0) { wins++; L.push(`🏋️‍♀️ Workout: ${t.workoutMin} min ✅`); }
  else if (t.gym === true) { wins++; L.push("🏋️‍♀️ Gym: went ✅"); }
  if (t.water !== null) { if (t.water >= config.waterTarget) wins++; L.push(`💧 Water: ${t.water}/${config.waterTarget} glasses ${t.water >= config.waterTarget ? "✅" : ""}`.trim()); }
  if (t.spent !== null) L.push(`💸 Spent: ${t.spent > 0 ? fmt(t.spent) : "nothing 🙌"}`);
  for (const w of t.wins.slice(0, 3)) { wins++; L.push(`✨ ${w}`); }
  if (L.length === 3) L.push("🤷‍♀️ Nothing logged today. I can't hype what I can't see, babe!");
  L.push("", wins >= 3 && misses === 0 ? pick([`🔥 ${wins} wins today. You were THAT girl. Screenshot this 📸`, `👑 ${wins} wins and zero excuses. Sleep like a champion`], "v1")
    : misses && !wins ? pick(["😮‍💨 Rough one. That's okay. Tomorrow we go again, harder 💪", "🫂 Not your best day, not your last day. Reset, sleep, slay tomorrow"], "v2")
    : pick([`💅 Solid day. ${wins ? `${wins} win${wins > 1 ? "s" : ""}` : "Some progress"}, and tomorrow we level up`, "✨ Not perfect, still progress. That's how glow-ups work"], "v3"));

  // Tomorrow
  const tm: string[] = [];
  for (const e of t.tomorrow.slice(0, 5)) tm.push(`${e.time ? `🕐 ${e.time}` : "📅"} ${e.title}`);
  for (const d of t.deadlinesSoon.slice(0, 3)) tm.push(`⏳ ${d.title} ${d.daysLeft === 1 ? "is TOMORROW" : `in ${d.daysLeft} days`}`);
  for (const b of t.billsTomorrow) tm.push(`🧾 Pay ${b}`);
  L.push("", "🔮 TOMORROW", ...(tm.length ? tm : ["🌿 Nothing in the calendar yet. Plan one small win before you sleep?"]));
  if (t.tomorrow.length >= 3) L.push(`📅 That's a packed day (${t.tomorrow.length} things). Lay out your stuff tonight 👗`);

  // Missing logs
  const miss: string[] = [];
  if (s && s.hours === 0) miss.push("study hours (if you did any)");
  if (t.water === null) miss.push("water");
  if (t.spent === 0) miss.push("spends (really nothing? 👀)");
  if (miss.length) L.push("", `📝 Before bed, log: ${miss.join(", ")}`);
  L.push("", pick(["Phone down, eyes closed, glow-up mode on 😴✨", "Sleep well, gorgeous. I'll be here at sunrise ☀️💕", "Go to bed. Yes, now. Love you 😘", "Beauty sleep is part of the plan, don't skip it 💤"], "sign"));
  return L.join("\n").slice(0, 4000);
}

/** Builds one slot's message. Returns null when there's nothing to send (midday with nothing urgent). */
export async function buildSlot(slot: SlotKey): Promise<string | null> {
  if (slot === "morning") return (await buildMorningMessage()).text;
  const t = await gatherToday();
  if (slot === "midday") {
    if (!t.urgent.length) return null;
    return [pick1(["🚨 Midday deadline check! The bot has concerns:", "⏰ Lunch break? Quick reality check first:", "🤖 Beep boop. Midday scan found urgent stuff:"], t.today), "", ...t.urgent.slice(0, 3)].join("\n");
  }
  return slot === "evening" ? formatEvening(t) : formatNight(t);
}
const pick1 = (list: string[], seed: string) => dailyShuffle(list, seed + "mid")[0];

/** Called by the alarm clock every few minutes: sends the slot that's due (if any) and logs it. */
export async function runTick() {
  if (!config.telegram.botToken || !config.telegram.chatId) return { skipped: "Telegram not set up" };
  const [times, log] = await Promise.all([loadBotTimes(), loadBotLog()]);
  const done = new Set(log.map((l) => l.slot));
  const due = dueSlots(times, done);
  if (!due.length) return { now: nowHM(), skipped: "nothing due", done: [...done] };
  // If the alarm clock was down and two slots piled up, only send the latest one.
  const send = due[due.length - 1];
  for (const old of due.slice(0, -1)) await logSlot(old.key, "skipped (later message sent instead)");
  if (send.key === "morning") await import("./opportunities").then((m) => m.getOpportunities()).catch(() => null); // fetch today's opportunities once a day
  const text = await buildSlot(send.key);
  if (!text) { await logSlot(send.key, "nothing urgent"); return { now: nowHM(), slot: send.key, sent: false, reason: "nothing urgent" }; }
  await sendTelegram(text);
  await logSlot(send.key, "sent");
  return { now: nowHM(), slot: send.key, sent: true };
}
