// The 7 AM "bestie" Telegram message: a recap of yesterday + today's to-do list.
// The facts and the to-do list are built from your real data here. Gemini (one call per morning)
// only writes the chatty, sassy parts. If Gemini is down or out of free quota, a built-in
// bestie voice writes them instead, so the message always arrives.
import { loadEvents, type CalEvent } from "./calendar";
import { config, contentIsDemo } from "./config";
import { addDays, daysBetween, todayISO } from "./dates";
import { fmt, loadFinance, upcomingBills } from "./finance";
import { investmentTodos, loadInvestments } from "./investments";
import { geminiJSON, hasGemini } from "./gemini";
import { dailyShuffle } from "./hype";
import { analyseHabits, analyseMeasurements, analyseWeight, loadHabits, loadWins, loadMeasurements, loadWeight, MEASURE_LABEL, MEASURES } from "./life";
import { studyNudges } from "./nudges";
import { analyseStudies, loadStudies, targetFor } from "./studies";
import { analyseContent, loadContent } from "./content";
import { analyseHealth, loadHealth } from "./health";

const r1 = (n: number) => Math.round(n * 10) / 10;
const isDone = (s: string) => /^(done|finished|complete|yes|✓|true)/i.test(s);
const weekday = (iso: string) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
const when = (days: number) => (days < 0 ? "OVERDUE" : days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`);

export type Recap = {
  date: string; weekday: string;
  study: { hours: number; target: number; subjects: string[]; streak: number } | null;
  tasksDone: string[];
  habits: { sleep: number | null; water: number | null; gym: boolean | null; gymThisWeek: number } | null;
  money: { spent: number; topSpends: string[]; income: number; budgetLeftPerDay: number | null } | null;
  weight: { kg: number; change: number | null; lostTotal: number; toGoal: number | null } | null;
  measured: string | null;
  watch: { steps: number | null; stepGoal: number; workoutMin: number; km: number | null; activeKcal: number | null; exerciseMin: number | null; workouts: string[]; restingHr: number | null; avgHr: number | null; maxHr: number | null; avgSteps7: number | null } | null;
  posts: string[];
  collabs: string[];
  events: string[];
  highlights: string[];
  notes: string[];
};
export type Todo = { icon: string; text: string };
export type MorningFacts = { name: string; today: string; todayWeekday: string; yesterday: Recap; todos: Todo[]; botNudge: string | null; studyTargetToday: number | null };

/** Collects everything about yesterday and today. Each data source is optional: if one isn't connected it's just skipped. */
export async function gatherMorningFacts(): Promise<MorningFacts> {
  const today = todayISO();
  const y = addDays(today, -1);
  const rec: Recap = { date: y, weekday: weekday(y), study: null, tasksDone: [], habits: null, money: null, weight: null, measured: null, watch: null, posts: [], collabs: [], events: [], highlights: [], notes: [] };
  const todos: Todo[] = [];
  let botNudge: string | null = null;
  let studyTargetToday: number | null = null;

  const [cal, fin, stu, hab, wt, ms, hl, con, hea] = await Promise.all([
    loadEvents(22, 1).catch(() => null),
    loadFinance().catch(() => null),
    loadStudies().catch(() => null),
    loadHabits().catch(() => null),
    loadWeight().catch(() => null),
    loadMeasurements().catch(() => null),
    loadWins().catch(() => null),
    contentIsDemo() ? Promise.resolve(null) : loadContent().catch(() => null),
    loadHealth().then((h) => (h.demo ? null : h)).catch(() => null),
  ]);
  const events: CalEvent[] = cal?.events ?? [];

  // ── Yesterday ──
  rec.events = events.filter((e) => e.date === y).map((e) => `${e.title}${e.category !== "Event" ? ` (${e.category})` : ""}`);
  if (stu) {
    const logs = stu.log.filter((l) => l.date === y);
    const a = analyseStudies(stu.deadlines, stu.tasks, stu.log, stu.targets);
    rec.study = { hours: r1(logs.reduce((s, l) => s + l.hours, 0)), target: targetFor(y, stu.targets), subjects: [...new Set(logs.map((l) => l.subject).filter(Boolean))], streak: a.streak };
    rec.tasksDone = stu.tasks.filter((t) => isDone(t.status) && t.doneOn === y).map((t) => (t.subject ? `${t.task} (${t.subject})` : t.task));
    studyTargetToday = a.target;
    // Today: deadlines this week + the top study tasks.
    for (const d of a.deadlineStatus.filter((d) => d.status !== "Done" && d.daysLeft <= 7)) {
      todos.push({ icon: d.daysLeft <= 2 ? "🚨" : "⏳", text: `${d.title} is ${when(d.daysLeft)}${d.remaining ? ` (~${r1(d.remaining)}h of work left)` : ""}` });
    }
    for (const p of a.priorities.slice(0, 3)) todos.push({ icon: "📚", text: `${p.task}${p.subject ? ` · ${p.subject}` : ""}` });
    const nudge = studyNudges(a, stu.tasks, events).find((n) => n.level === "fire" || n.level === "warn");
    botNudge = nudge?.text ?? null;
  }
  if (hab) {
    const d = hab.days.find((x) => x.date === y);
    const h = analyseHabits(hab.days);
    if (d) { rec.habits = { sleep: d.sleep, water: d.water, gym: d.gym, gymThisWeek: h.gymThisWeek }; if (d.notes) rec.notes.push(d.notes); }
  }
  if (fin) {
    const ys = fin.txns.filter((t) => t.date === y);
    const exp = ys.filter((t) => t.type === "Expense");
    const byCat = new Map<string, number>();
    for (const t of exp) byCat.set(t.category || "Other", (byCat.get(t.category || "Other") || 0) + t.amount);
    rec.money = {
      spent: exp.reduce((s, t) => s + t.amount, 0),
      topSpends: [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, n]) => `${c} ${fmt(n)}`),
      income: ys.filter((t) => t.type === "Income").reduce((s, t) => s + t.amount, 0),
      budgetLeftPerDay: null,
    };
    for (const b of upcomingBills(fin.bills, 3)) todos.push({ icon: "🧾", text: `Pay ${b.name} ${fmt(b.amount)} (${when(daysBetween(today, b.due))})` });
    if (!fin.demo) todos.push(...investmentTodos((await loadInvestments().catch(() => null))?.items ?? [])); // FD maturities this week
  }
  if (wt) {
    const e = wt.entries.find((x) => x.date === y);
    const a = analyseWeight(wt.entries);
    if (e && a) {
      const prev = [...wt.entries].reverse().find((x) => x.date < y);
      rec.weight = { kg: e.kg, change: prev ? r1(e.kg - prev.kg) : null, lostTotal: r1(a.lost), toGoal: a.goal ? r1(e.kg - a.goal) : null };
      if (e.notes) rec.notes.push(e.notes);
    }
  }
  if (ms && ms.entries.some((m) => m.date === y)) {
    const a = analyseMeasurements(ms.entries);
    const lost = a ? MEASURES.filter((m) => a.change[m] < 0).map((m) => `${MEASURE_LABEL[m]} ${r1(-a.change[m])} cm`) : [];
    rec.measured = lost.length ? `down ${lost.join(", ")} since day 1 (${a!.totalLost} cm total)` : "logged new measurements";
  }
  if (hea) {
    const a = analyseHealth(hea.days, today);
    const d = a.yesterday;
    if (d) rec.watch = { steps: d.steps, stepGoal: config.stepGoal, workoutMin: Math.round(d.workouts.reduce((x, w) => x + w.minutes, 0)), km: d.distanceKm, activeKcal: d.activeKcal, exerciseMin: d.exerciseMin, workouts: d.workouts.map((w) => `${w.type} ${Math.round(w.minutes)} min`), restingHr: d.restingHr, avgHr: d.avgHr, maxHr: d.maxHr, avgSteps7: a.avgSteps7 ? Math.round(a.avgSteps7) : null };
    if (a.daysSinceSync !== null && a.daysSinceSync >= 2) todos.push({ icon: "⌚", text: `Your Apple Watch hasn't synced for ${a.daysSinceSync} days. Open Shortcuts and tap "Sync Health to Dashboard"` });
  }
  if (hl) rec.highlights = hl.items.filter((h) => h.date === y).map((h) => (h.photo ? `${h.text} (with a photo 📸)` : h.text));
  if (con) {
    rec.posts = con.uploads.filter((u) => u.date === y).map((u) => `${u.channel}: "${u.title || u.type}" on ${u.platforms.join(", ")}`);
    rec.collabs = con.collabs.filter((c) => c.date === y).map((c) => `${c.brand} (${c.status}${c.price ? `, ${fmt(c.price)}` : ""})`);
    const a = analyseContent(con.followers, con.uploads, con.collabs, today, con.goals);
    for (const c of a.dueSoon) todos.push({ icon: "🤝", text: `${c.brand} collab: ${c.idea || "video"} (${when(daysBetween(today, c.due))})` });
    const stale = a.nudges.filter((n) => n.daysSince === null || n.daysSince >= 7);
    if (stale.length) todos.push({ icon: "🎀", text: `Post something! Quiet for 7+ days on ${stale.map((n) => `${n.channel} ${n.platform}`).join(", ")}` });
  }

  // ── Today's calendar goes first ──
  const cals = events.filter((e) => e.date === today).map((e) => ({ icon: e.time ? "🕐" : "📅", text: `${e.time ? e.time + " " : ""}${e.title}` }));
  return { name: config.ownerName, today, todayWeekday: weekday(today), yesterday: rec, todos: [...cals, ...todos], botNudge, studyTargetToday };
}

// ───────── Writing the message ─────────
type Voice = { opening: string; recap: string[]; todayHype: string; signoff: string };

/** Built-in bestie voice (no AI). Picks change every day. */
export function fallbackVoice(f: MorningFacts): Voice {
  const pick = <T,>(list: T[], salt: string) => dailyShuffle(list, f.today + salt)[0];
  const n = f.name;
  const r = f.yesterday;
  const recap: string[] = [];
  const s = r.study;
  if (s && s.target > 0) {
    const pct = s.hours / s.target;
    if (s.hours === 0) recap.push(pick([`📚 Study: 0 hours out of ${s.target}. Babe… the books miss you. We fix that TODAY. 😤`, `📚 Zero study hours yesterday (goal was ${s.target}). A rest day? Fine. Two? Absolutely not. 🙅‍♀️`], "s0"));
    else if (pct >= 1) recap.push(pick([`📚 ${s.hours}h of studying vs a ${s.target}h goal. GOAL SMASHED, nerd queen 🤓👑`, `📚 You studied ${s.hours}h (goal ${s.target}h). Over-achiever behaviour and I'm obsessed 😍`], "s1") + (s.subjects.length ? ` (${s.subjects.join(", ")})` : ""));
    else recap.push(pick([`📚 ${s.hours}h out of ${s.target}h studied. ${Math.round(pct * 100)}% there, not bad, not done 😏`, `📚 ${s.hours}/${s.target}h of study. Close! Today we close the gap, deal? 🤝`], "s2"));
    if (s.streak >= 3) recap.push(`🔥 That's a ${s.streak}-day study streak. Don't you dare break it.`);
  }
  if (r.tasksDone.length) recap.push(`✅ Ticked off ${r.tasksDone.length} task${r.tasksDone.length > 1 ? "s" : ""}: ${r.tasksDone.join(", ")}. Look at you go!`);
  const h = r.habits;
  if (h) {
    const bits: string[] = [];
    if (h.gym) bits.push(`hit the gym 🏋️‍♀️ (${h.gymThisWeek} this week!)`);
    if (h.sleep !== null) bits.push(`slept ${h.sleep}h ${h.sleep >= config.sleepTarget ? "😴✨" : "(we need more beauty sleep 👀)"}`);
    if (h.water !== null) bits.push(`${h.water} glasses of water ${h.water >= config.waterTarget ? "💧 hydrated queen" : "(drink up today 🥤)"}`);
    if (bits.length) recap.push(`💪 You ${bits.join(", ")}`);
  }
  if (r.weight) {
    const c = r.weight.change;
    recap.push(`⚖️ Weighed in at ${r.weight.kg} kg${c !== null ? (c < 0 ? `, down ${-c} kg 📉 YES GIRL` : c > 0 ? `, up ${c} kg (water weight, don't stress 💅)` : ", holding steady") : ""}. ${r.weight.lostTotal > 0 ? `${r.weight.lostTotal} kg gone in total!` : ""}`.trim());
  }
  const wa = r.watch;
  if (wa) {
    // Short and fun: one line for the workout, one for the steps. No stats dump.
    const k = (x: number) => (x >= 1000 ? `${(Math.round(x / 100) / 10).toString().replace(/\.0$/, "")}k` : `${Math.round(x)}`);
    const mins = wa.workoutMin || (wa.exerciseMin && wa.exerciseMin >= 20 ? wa.exerciseMin : 0);
    if (mins > 0) {
      const t = mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60} min` : ""}` : `${mins} min`;
      recap.push(pick([
        `💪 You worked out for ${t} yesterday. Are your muscles burning yet? 🔥`,
        `🏋️‍♀️ ${t} of working out! Sore today? That's the glow-up loading 😮‍💨`,
        `💦 ${t} of sweat yesterday. Your muscles are crying, I'm clapping 👏`,
        `🔥 You moved for ${t}. Gym girlie behaviour, honestly obsessed 💅`,
      ], "wo"));
    }
    if (wa.steps !== null && wa.steps > 0) {
      const g = wa.stepGoal;
      recap.push(wa.steps >= g
        ? pick([`👟 And you walked ${k(wa.steps)} steps. Way to go, queen! 👑`, `👟 ${k(wa.steps)} steps walked. Those legs are SERVING 💅`, `👟 ${k(wa.steps)} steps! Hot girl walk: completed ✅`], "st1")
        : wa.steps >= g * 0.6 ? pick([`👟 You walked ${k(wa.steps)} steps. Not bad! A little more today? 😉`, `👟 ${k(wa.steps)} steps. Almost at ${k(g)}, so close! 🚶‍♀️`], "st2")
        : pick([`👟 Only ${k(wa.steps)} steps… babe, let's walk it out today 🚶‍♀️`, `👟 ${k(wa.steps)} steps. The couch had you, huh? 🛋️ Let's move today!`], "st3"));
    }
  }
  if (r.measured) recap.push(`📏 Measurements: ${r.measured} 🔥`);
  if (r.money) {
    if (r.money.spent > 0) recap.push(`💸 Spent ${fmt(r.money.spent)}${r.money.topSpends.length ? ` (${r.money.topSpends.join(", ")})` : ""}`);
    else recap.push(pick(["💸 Spent NOTHING. Your wallet is sending a thank-you card 💌", "💸 Zero rupees spent. Financially responsible AND hot? Unfair. 😌"], "m0"));
    if (r.money.income > 0) recap.push(`🤑 And ${fmt(r.money.income)} came in. Money moves!`);
  }
  if (r.posts.length) recap.push(`🎬 Posted: ${r.posts.join("; ")}. Content queen era 👑`);
  if (r.collabs.length) recap.push(`🤝 New collab: ${r.collabs.join(", ")}. The brands are CALLING 📞`);
  if (r.events.length) recap.push(`📅 Showed up for: ${r.events.slice(0, 4).join(", ")}`);
  for (const t of r.highlights) recap.push(`✨ ${t}`);
  if (!recap.length) recap.push(pick(["🤷‍♀️ Nothing got logged yesterday, so I'm assuming you were busy being iconic. Log stuff today so I can brag about you!", "👀 Your sheets were empty yesterday. Mysterious. Log today so I can hype you properly!"], "empty"));

  const busy = f.todos.length;
  return {
    opening: pick([`☀️ GOOD MORNING ${n.toUpperCase()}!! Rise and slay, bestie 💅✨`, `🌸 Morning gorgeous! Coffee in hand? Let's look at what you did, ${n} ☕💕`, `🌞 Wakey wakey ${n}! Your hype girl has the receipts from ${r.weekday} 🧾✨`, `💖 Hiii ${n}! It's ${f.todayWeekday} and you're about to eat it up 🍽️`], "open"),
    recap,
    todayHype: busy === 0 ? "Nothing on the list today? Rest, glow, maybe study a little 😉" : busy > 6 ? `Big day (${busy} things!) but you've handled worse before breakfast 😤🔥` : pick(["Totally doable. One thing at a time, you've got this 💪", "Small list, big energy. Let's gooo 🚀"], "hype"),
    signoff: pick(["Now go be unstoppable 💋 — your bestie bot", "Love you, mean it, now get to work 😘", "I believe in you more than Wi-Fi believes in buffering 📶💕", "Main character schedule loading… 🎬✨"], "sign"),
  };
}

async function aiVoice(f: MorningFacts): Promise<Voice> {
  const prompt = `You are ${f.name}'s sassy, loving best friend texting her a good-morning message on Telegram.
Style: Gen-Z hype-girl bestie, playful, warm, a bit cheeky, lots of emojis, short punchy lines, NOT professional, NOT generic quotes. Mix it up every day (today is ${f.todayWeekday} ${f.today}).
Use ONLY the facts below with their real numbers. Never invent achievements, numbers or events. If something wasn't logged, don't mention it (or tease her gently to log it). Celebrate wins loudly; for misses be cheeky but kind and turn it into today's mission.
"watch" is her Apple Watch data. Keep it SHORT and fun, max 2 lines, no stats dump (no kcal, no heart rate, no workout list): one line about how long she worked out (workoutMin, or exerciseMin if no workout) like "you worked out 45 min, are your muscles burning? 🔥", and one about her steps like "you walked 8.4k steps, way to go!" (tease cheekily if under stepGoal).
Each "highlights" item is a win / special thing she logged on her Wins page (steps, yoga, volunteering...): make a BIG deal of each one, by name.

FACTS ABOUT YESTERDAY (${f.yesterday.weekday}):
${JSON.stringify(f.yesterday)}

TODAY: ${f.todos.length} to-dos (shown to her separately as a list), study goal ${f.studyTargetToday ?? "not set"}h. To-dos: ${JSON.stringify(f.todos.map((t) => t.text))}

Reply as JSON: {"opening": "1 line greeting using her name", "recap": ["4-8 short lines recapping yesterday, each starting with an emoji"], "todayHype": "1-2 lines hyping her for today's list, can mention the busiest/most important item", "signoff": "1 fun sign-off line"}`;
  const { data } = await geminiJSON<Voice>(prompt, { temperature: 1 });
  if (!data?.opening || !Array.isArray(data.recap) || !data.recap.length) throw new Error("Gemini reply missing parts");
  return { opening: String(data.opening), recap: data.recap.map(String).slice(0, 10), todayHype: String(data.todayHype || ""), signoff: String(data.signoff || "") };
}

export function formatMorning(f: MorningFacts, v: Voice): string {
  const lines = [v.opening, "", `🔙 ${f.yesterday.weekday.toUpperCase()} RECAP`, ...v.recap, "", "📋 TODAY'S TO-DO"];
  lines.push(...(f.todos.length ? f.todos.slice(0, 14).map((t) => `${t.icon} ${t.text}`) : ["🌿 Nothing scheduled. Rare. Enjoy it."]));
  if (f.studyTargetToday) lines.push(`🎯 Study goal: ${f.studyTargetToday}h`);
  if (f.botNudge) lines.push("", f.botNudge.startsWith("🤖") ? f.botNudge : `🤖 ${f.botNudge}`);
  if (v.todayHype) lines.push("", v.todayHype);
  if (v.signoff) lines.push(v.signoff);
  return lines.join("\n").slice(0, 4000); // Telegram's limit is 4096 characters
}

/** Builds the whole message. Uses one Gemini call when a key is set, otherwise (or on any error) the built-in voice. */
export async function buildMorningMessage(): Promise<{ text: string; ai: boolean; aiError?: string }> {
  const f = await gatherMorningFacts();
  if (hasGemini()) {
    try { return { text: formatMorning(f, await aiVoice(f)), ai: true }; }
    catch (e) { return { text: formatMorning(f, fallbackVoice(f)), ai: false, aiError: String(e).slice(0, 200) }; }
  }
  return { text: formatMorning(f, fallbackVoice(f)), ai: false };
}

export async function sendTelegram(text: string) {
  if (!config.telegram.botToken || !config.telegram.chatId) throw new Error("Telegram isn't set up (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)");
  const res = await fetch(`https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: config.telegram.chatId, text }),
  });
  if (!res.ok) throw new Error(`Telegram ${res.status}: ${(await res.text()).slice(0, 160)}`);
}
