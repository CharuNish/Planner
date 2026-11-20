// The "deadline bot": pushy, specific nudges for submissions, publications and study goals.
// Uses your real deadlines, tasks, study log and calendar (how busy you are before each deadline).
import type { CalEvent } from "./calendar";
import { config } from "./config";
import { addDays, todayISO } from "./dates";
import { dailyShuffle } from "./hype";
import type { analyseStudies, Task } from "./studies";

type A = ReturnType<typeof analyseStudies>;
export type Nudge = { level: "fire" | "warn" | "info" | "good"; text: string };

const DAY = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
const h1 = (n: number) => (Math.round(n * 10) / 10).toString();
const isDone = (t: Task) => /^(done|finished|complete|yes|✓|true)/i.test(t.status);

/** Hours left today in your time zone (until midnight). */
export function hoursLeftToday() {
  const parts = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: config.timezone }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value || 0), m = Number(parts.find((p) => p.type === "minute")?.value || 0);
  return Math.max(0, 24 - h - m / 60);
}

function pick<T>(list: T[], seed: string) { return dailyShuffle(list, seed)[0]; }

export function studyNudges(a: A, tasks: Task[], events: CalEvent[], today = todayISO()): Nudge[] {
  const out: Nudge[] = [];
  const left = hoursLeftToday();
  const awake = Math.max(0, left - 1.5); // leave some time to sleep, babe

  for (const d of a.deadlineStatus.filter((x) => x.status !== "Done" && x.daysLeft <= 21).slice(0, 4)) {
    const linked = tasks.filter((t) => !isDone(t) && (t.deadline ? t.deadline.toLowerCase() === d.title.toLowerCase() : d.subject && t.subject.toLowerCase() === d.subject.toLowerCase()));
    const next = linked.sort((x, y) => (/high|urgent|1/i.test(y.priority) ? 1 : 0) - (/high|urgent|1/i.test(x.priority) ? 1 : 0))[0];
    const before = events.filter((e) => e.date >= today && e.date < d.due && !/Deadline|Bill|Subscription|Payment/.test(e.category) && !e.title.toLowerCase().includes(d.title.toLowerCase()));
    // A day counts as "busy" when it has 2+ things in your calendar (or an exam / all-day event).
    const byDay = new Map<string, CalEvent[]>();
    for (const e of before) byDay.set(e.date, [...(byDay.get(e.date) || []), e]);
    const busyDates = [...byDay.entries()].filter(([, es]) => es.length >= 2 || es.some((e) => !e.time || /Exam|Function/.test(e.category))).map(([dt]) => dt).sort();
    const busyDays = busyDates.length;
    const clean = (t: string) => t.replace(/^\[[^\]]+\]\s*/, "");
    const busyList = busyDates.slice(0, 3).map((dt) => `${DAY(dt)}: ${byDay.get(dt)!.slice(0, 2).map((e) => clean(e.title)).join(" + ")}`).join("; ") + (busyDates.length > 3 ? " and more" : "");
    const freeDays = Math.max(0, d.daysLeft - busyDays);
    const perDay = d.remaining / Math.max(1, freeDays || d.daysLeft || 1);
    const pub = /publication|paper|conference|journal|camera/i.test(d.type + " " + d.title);
    const step = next ? `“${next.task}”${next.hours ? ` (${h1(next.hours)}h)` : ""}` : "";
    const noPlan = !linked.length && !d.total;
    const seed = today + d.title;
    const busyBit = busyDays ? ` And ${busyDays === 1 ? "one of those days is" : `${busyDays} of those days are`} already packed (${busyList}).` : "";

    if (d.daysLeft <= 0) {
      out.push({ level: "fire", text: pick([
        `🚨 ${d.title} is due TODAY. Not tomorrow. TODAY. ${d.remaining ? `${h1(d.remaining)}h of work left` : "Whatever's left"} and only ${h1(awake)}h left before bedtime. Close every other tab${step ? ` and start with ${step}` : ""}. Go. Now.`,
        `🔥 Red alert: ${d.title} closes today. ${step ? `Your one job right now: ${step}.` : "Finish it, submit it, celebrate later."} ${h1(left)} hours left on the clock. The clock does not care about your feelings.`,
      ], seed) });
    } else if (d.daysLeft <= 3) {
      out.push({ level: "fire", text: pick([
        `⏰ ${d.title}: ${d.daysLeft} day${d.daysLeft > 1 ? "s" : ""} left. That's it.${busyBit} So realistically you have ${freeDays} free day${freeDays === 1 ? "" : "s"}.${d.remaining ? ` ${h1(d.remaining)}h of work = ${h1(perDay)}h a day.` : ""} ${step ? `Do ${step} before you sleep tonight.` : "Start tonight."}`,
        `😳 Girl. ${d.title} is ${d.daysLeft === 1 ? "TOMORROW" : `in ${d.daysLeft} days`}.${busyBit} ${step ? `At least finish ${step} today. Even a messy version counts.` : "Open the file. Write one paragraph. Momentum is everything."}`,
        `🤖 Beep boop, deadline bot here. ${d.title} in ${d.daysLeft} day${d.daysLeft > 1 ? "s" : ""}, ${d.remaining ? `${h1(d.remaining)}h still to do` : "and it's not done"}.${busyBit} My calculations say: start ${step || "it"} within the next hour.`,
      ], seed) });
    } else if (d.daysLeft <= 7) {
      out.push({ level: d.status === "On track" ? "warn" : "fire", text: pick([
        `😤 You're losing time. ${d.title} is in ${d.daysLeft} days.${busyBit}${d.remaining ? ` That leaves ${h1(d.remaining)}h of work for ${freeDays} free day${freeDays === 1 ? "" : "s"}: ${freeDays <= 1 ? "all of it on that one day" : `${h1(perDay)}h every one of them`}.` : ""} ${step ? `Begin with ${step}. Today.` : ""}`,
        `📉 Only ${d.daysLeft} days to ${d.title}${busyDays ? `, and you're busy on ${busyDays} of them` : ""}. ${step ? `Knock out ${step} today and future-you will send flowers. 💐` : "Pick the smallest piece and do it today."}`,
        `🫵 Yes, you. ${d.title}. ${d.daysLeft} days.${busyBit} ${d.remaining ? `${h1(perDay)}h a day from now on, no skipping.` : ""} ${step ? `Today's mission: ${step}.` : ""}`,
      ], seed) + (pub ? " Reviewers don't accept “I was busy”. 📝" : "") });
    } else if (d.status !== "On track" || noPlan) {
      out.push({ level: "info", text: pick([
        `👀 ${d.title} in ${d.daysLeft} days feels far. It isn't.${busyBit} ${d.remaining ? `You need ${h1(perDay)}h on each free day.` : ""} ${step ? `Start with ${step} this week.` : ""}`,
        `🧠 ${d.title}: ${d.daysLeft} days, ${d.status === "Behind" ? "and you're BEHIND" : "and it's getting tight"}. ${step ? `A small win today: ${step}.` : ""}`,
      ], seed) });
    }
    if (noPlan && d.daysLeft <= 14) out.push({ level: "warn", text: `🗂️ You haven't broken “${d.title}” into tasks yet. Add 3 small steps to the Tasks tab (with hours). That's today's mission, it takes 5 minutes.` });
  }

  // Today's study goal.
  if (a.target > 0) {
    const gap = a.target - a.hoursToday;
    if (gap <= 0) out.push({ level: "good", text: pick([`✅ Study goal smashed today (${h1(a.hoursToday)}h / ${h1(a.target)}h). Proud of you. Now drink some water. 💧`, `🏆 ${h1(a.hoursToday)}h studied today. Goal: done. You're that girl. 💅`], today + "g") });
    else if (awake <= 0.5) out.push({ level: "warn", text: `🌙 Missed today's goal by ${h1(gap)}h. It's late, so sleep. Tomorrow we go again, harder. 💪` });
    else out.push({ level: a.hoursToday === 0 ? "fire" : "warn", text: pick([
      `📚 Today: ${h1(a.hoursToday)}h of ${h1(a.target)}h. ${h1(gap)}h to go and ${h1(awake)}h left before bed. ${gap > awake ? "Even the full goal won't fit now, so do what you can, starting NOW." : "Start a 25-minute timer right now. Just one."}`,
      `⏳ ${h1(gap)}h of studying left for today${a.hoursToday === 0 ? ", and you haven't started" : ""}. ${h1(awake)}h until bedtime. Phone face down. Go.`,
      `🤖 Study goal status: ${Math.round((a.hoursToday / a.target) * 100)}%. Required: 100%. Time remaining: ${h1(awake)}h. Recommended action: open your notes immediately.`,
    ], today + "s") });
  }
  if (a.zeroDays >= 3) out.push({ level: "warn", text: `🫠 ${a.zeroDays} zero-study days in the last 2 weeks. That's about ${Math.round(a.wastedHours)}h below your goals. Not today.` });
  // Upcoming busy stretch heads-up.
  const tomorrowBusy = events.filter((e) => e.date === addDays(today, 1)).length;
  if (tomorrowBusy >= 3 && out.some((n) => n.level === "fire")) out.push({ level: "info", text: `📅 Tomorrow is packed (${tomorrowBusy} things). Whatever you can do today, do it today.` });
  return out;
}
