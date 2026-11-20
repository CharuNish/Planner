import { config, studiesIsDemo } from "./config";
import { addDays, daysBetween, parseDate, todayISO } from "./dates";
import { demoDeadlines, demoStudyLog, demoTasks } from "./demo";
import { num, readSheet, str } from "./google";

export type Deadline = { title: string; type: string; subject: string; due: string; notes: string };
export type Task = { subject: string; task: string; deadline: string; status: string; hours: number; doneOn: string; priority: string };
export type StudyEntry = { date: string; hours: number; subject: string };
export type TargetOverride = { date: string; hours: number };

export async function loadStudies() {
  if (studiesIsDemo()) return { demo: true, deadlines: demoDeadlines() as Deadline[], tasks: demoTasks() as Task[], log: demoStudyLog() as StudyEntry[], targets: [] as TargetOverride[] };
  const id = config.google.studiesSheetId;
  const [d, t, l, tg] = await Promise.all([readSheet(id, "Deadlines"), readSheet(id, "Tasks").catch(() => []), readSheet(id, "StudyLog").catch(() => []), readSheet(id, "Targets").catch(() => [])]);
  return {
    demo: false,
    deadlines: d.map((r) => ({ title: str(r["title"]), type: str(r["type"]) || "Exam", subject: str(r["subject"]), due: parseDate(r["due date"] ?? r["due"]) || "", notes: str(r["notes"]) })).filter((x) => x.title && x.due),
    tasks: t.map((r) => ({
      subject: str(r["subject"]), task: str(r["task"]), deadline: str(r["deadline"]), status: str(r["status"]) || "Todo",
      hours: num(r["est hours"] ?? r["hours"]), doneOn: parseDate(r["done on"]) || "", priority: str(r["priority"]),
    })).filter((x) => x.task),
    log: l.map((r) => ({ date: parseDate(r["date"]) || "", hours: num(r["hours"]), subject: str(r["subject"]) })).filter((x) => x.date),
    // Optional "Targets" tab (Date | Hours) to set a different goal for specific days, e.g. exam week or a busy day.
    targets: tg.map((r) => ({ date: parseDate(r["date"]) || "", hours: num(r["hours"]) })).filter((x) => x.date),
  };
}

const isDone = (t: Task) => /^(done|finished|complete|yes|✓|true)/i.test(t.status);
const hoursOf = (t: Task) => t.hours > 0 ? t.hours : 2; // blank estimate = 2 hours

/** Study goal for a date: a "Targets" tab entry if there is one, otherwise the weekday goal. */
export function targetFor(date: string, overrides: TargetOverride[] = []) {
  const o = overrides.find((x) => x.date === date);
  if (o) return o.hours;
  const monFirst = (new Date(date + "T12:00:00Z").getUTCDay() + 6) % 7;
  return config.studyTargetsByWeekday[monFirst];
}

export function analyseStudies(deadlines: Deadline[], tasks: Task[], log: StudyEntry[], overrides: TargetOverride[] = []) {
  const today = todayISO();
  const target = targetFor(today, overrides);

  // Daily hours for the last 28 days
  const daily = Array.from({ length: 28 }, (_, i) => {
    const date = addDays(today, i - 27);
    const hours = log.filter((e) => e.date === date).reduce((a, e) => a + e.hours, 0);
    return { date, label: date.slice(8, 10) + "/" + date.slice(5, 7), hours, target: targetFor(date, overrides) };
  });
  const last14 = daily.slice(-15, -1); // the 14 full days before today
  const avg14 = last14.reduce((a, d) => a + d.hours, 0) / 14;
  const last7 = daily.slice(-8, -1);
  const week = last7.reduce((a, d) => a + d.hours, 0);
  const zeroDays = last14.filter((d) => d.hours === 0).length;
  const hoursToday = daily[daily.length - 1].hours;
  let streak = 0;
  for (let i = daily.length - (hoursToday > 0 ? 1 : 2); i >= 0 && daily[i].hours > 0; i--) streak++;

  const upcoming = deadlines.filter((d) => d.due >= today).sort((a, b) => a.due.localeCompare(b.due));
  const linked = (d: Deadline) => tasks.filter((t) => t.deadline ? t.deadline.toLowerCase() === d.title.toLowerCase() : (d.subject && t.subject.toLowerCase() === d.subject.toLowerCase()));

  // "Earliest deadline first" check: can my usual study pace cover all work due by each date?
  const pace = Math.max(avg14, 0.1);
  let cumulative = 0;
  const deadlineStatus = upcoming.map((d) => {
    const ts = linked(d);
    const done = ts.filter(isDone);
    const remaining = ts.filter((t) => !isDone(t)).reduce((a, t) => a + hoursOf(t), 0);
    cumulative += remaining;
    const daysLeft = daysBetween(today, d.due);
    const available = pace * Math.max(daysLeft, 0.5);
    const needPerDay = cumulative / Math.max(daysLeft, 1);
    let status: "On track" | "Tight" | "Behind" | "Done" = "On track";
    if (remaining === 0 && ts.length) status = "Done";
    else if (cumulative > available) status = "Behind";
    else if (cumulative > available * 0.8) status = "Tight";
    return { ...d, daysLeft, total: ts.length, doneCount: done.length, remaining, needPerDay, status };
  });

  // What to do first: urgent + big + marked high priority.
  const dueOf = (t: Task) => upcoming.find((d) => linked(d).includes(t));
  const priorities = tasks.filter((t) => !isDone(t)).map((t) => {
    const d = dueOf(t);
    const daysLeft = d ? daysBetween(today, d.due) : 60;
    const boost = /high|urgent|1/i.test(t.priority) ? 2 : /low|3/i.test(t.priority) ? 0.6 : 1;
    const score = (hoursOf(t) / Math.max(daysLeft, 1)) * boost + (daysLeft <= 3 ? 3 : 0);
    const reason = d ? `${d.title} is ${daysLeft === 0 ? "today" : `in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}, about ${hoursOf(t)}h of work` : `No deadline linked, about ${hoursOf(t)}h`;
    return { ...t, score, reason, daysLeft };
  }).sort((a, b) => b.score - a.score).slice(0, 5);

  const subjects = [...new Set(tasks.map((t) => t.subject).filter(Boolean))].map((s) => {
    const ts = tasks.filter((t) => t.subject === s);
    const hrs = log.filter((e) => e.subject === s && daysBetween(e.date, today) <= 28).reduce((a, e) => a + e.hours, 0);
    return { subject: s, done: ts.filter(isDone).length, total: ts.length, hours28: hrs };
  });

  const behind = deadlineStatus.filter((d) => d.status === "Behind");
  const overall = behind.length ? "Behind" : deadlineStatus.some((d) => d.status === "Tight") ? "Tight" : "On track";
  const maxNeed = Math.max(0, ...deadlineStatus.filter((d) => d.status !== "Done").map((d) => d.needPerDay));

  return {
    today, target, daily, avg14, week, zeroDays, hoursToday, streak, deadlineStatus, priorities, subjects, overall, maxNeed,
    done: tasks.filter(isDone).length, todo: tasks.filter((t) => !isDone(t)),
    finished: tasks.filter(isDone).sort((a, b) => b.doneOn.localeCompare(a.doneOn)),
    weekTarget: last7.reduce((a, d) => a + d.target, 0),
    avgTarget14: last14.reduce((a, d) => a + d.target, 0) / 14,
    wastedHours: Math.max(0, last14.reduce((a, d) => a + d.target - d.hours, 0)),
  };
}
