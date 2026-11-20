import { calendarIsDemo, config } from "./config";
import { addDays, todayISO, toISODate } from "./dates";
import { demoEvents } from "./demo";
import { listEvents } from "./google";

export type CalEvent = { id: string; date: string; time: string | null; endTime: string | null; title: string; category: string; location: string; source: string };

export const CATEGORIES = ["Meeting", "Lecture", "Class", "Exam", "Deadline", "Gym", "Bill", "Subscription", "Payment", "Function", "Event", "Other"] as const;

export const CATEGORY_STYLE: Record<string, string> = {
  Meeting: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  Lecture: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200",
  Class: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200",
  Exam: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  Deadline: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  Gym: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  Bill: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  Subscription: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200",
  Payment: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  Function: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200",
  Event: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  Other: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
};

export const CATEGORY_DOT: Record<string, string> = {
  Meeting: "#0ea5e9", Lecture: "#6366f1", Class: "#6366f1", Exam: "#f43f5e", Deadline: "#f97316", Gym: "#10b981",
  Bill: "#f59e0b", Subscription: "#eab308", Payment: "#f59e0b", Function: "#d946ef", Event: "#8b5cf6", Other: "#a1a1aa",
};

/** Guesses a category. Tip: start an event title with "[Gym]" or "Exam:" to force it. */
export function categorise(title: string, description = ""): string {
  const tag = title.match(/^\s*\[([^\]]+)\]/)?.[1] || title.match(/^\s*(\w+)\s*:/)?.[1];
  if (tag) {
    const hit = CATEGORIES.find((c) => c.toLowerCase() === tag.toLowerCase());
    if (hit) return hit;
  }
  const t = (title + " " + description).toLowerCase();
  const rules: [string, RegExp][] = [
    ["Exam", /\b(exam|quiz|test|midterm|viva)\b/], ["Deadline", /\b(deadline|due|submission|submit|ddl)\b/],
    ["Gym", /\b(gym|workout|run|yoga|training)\b/], ["Bill", /\b(bill|rent|electric|water|ceb|internet)\b/],
    ["Subscription", /\b(subscription|renewal|netflix|spotify|medium|icloud)\b/], ["Payment", /\b(payment|pay|loan|installment)\b/],
    ["Lecture", /\b(lecture)\b/], ["Class", /\b(class|tutorial|lab)\b/], ["Meeting", /\b(meeting|call|zoom|meet|sync|1:1)\b/],
    ["Function", /\b(wedding|birthday|party|function|funeral|almsgiving|dana)\b/],
  ];
  return rules.find(([, re]) => re.test(t))?.[0] || "Event";
}

const clean = (title: string) => title.replace(/^\s*\[[^\]]+\]\s*/, "");

export async function loadEvents(days = 45, pastDays = 0): Promise<{ demo: boolean; events: CalEvent[]; error?: string }> {
  if (calendarIsDemo()) return { demo: true, events: demoEvents() };
  const start = addDays(todayISO(), -pastDays);
  const timeMin = new Date(start + "T00:00:00Z").toISOString();
  const timeMax = new Date(addDays(start, days + pastDays) + "T23:59:59Z").toISOString();
  const all: CalEvent[] = [];
  let error: string | undefined;
  await Promise.all(config.google.calendarIds.map(async (cid) => {
    try {
      const items = await listEvents(cid, timeMin, timeMax);
      for (const e of items) {
        const title = e.summary || "(no title)";
        const dt = e.start.dateTime ? new Date(e.start.dateTime) : null;
        const et = e.end?.dateTime ? new Date(e.end.dateTime) : null;
        const time = dt ? dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: config.timezone, hour12: false }) : null;
        all.push({
          id: e.id, date: dt ? toISODate(dt) : (e.start.date || ""), time,
          endTime: et ? et.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: config.timezone, hour12: false }) : null,
          title: clean(title), category: categorise(title, e.description), location: e.location || "", source: cid,
        });
      }
    } catch (err) {
      error = String(err);
    }
  }));
  all.sort((a, b) => (a.date + (a.time || "00:00")).localeCompare(b.date + (b.time || "00:00")));
  return { demo: false, events: all, error };
}
