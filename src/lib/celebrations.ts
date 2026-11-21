// Builds the "you did it!" messages each tab celebrates (see src/components/celebrate.tsx).
// Every achievement gets a stable id, so the browser only celebrates it once.
import type { Achievement } from "@/components/celebrate";
import { addDays, todayISO } from "./dates";
import type { Deadline, Task } from "./studies";

/** Same achievement always gets the same line, but different achievements get different lines. */
function line(id: string, options: string[]) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return options[h % options.length];
}
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const isDone = (t: Task) => /^(done|finished|complete|yes|✓|true)/i.test(t.status);

/**
 * Studies: a deadline (exam / submission) counts as finished when every task linked to it is done,
 * or when its Notes start with "submitted", "done", "completed" or "finished". Only the last 30 days and upcoming ones count.
 */
export function deadlineWins(deadlines: Deadline[], tasks: Task[], today = todayISO()): Achievement[] {
  const from = addDays(today, -30);
  return deadlines.filter((d) => d.due >= from).flatMap((d) => {
    const ts = tasks.filter((t) => t.deadline ? t.deadline.toLowerCase() === d.title.toLowerCase() : (d.subject && t.subject.toLowerCase() === d.subject.toLowerCase()));
    const noted = /^\s*(submitted|done|completed|finished)\b/i.test(d.notes);
    const allDone = ts.length > 0 && ts.every(isDone);
    if (!noted && !allDone) return [];
    const id = `studies:${slug(d.title)}:${d.due}`;
    const n = allDone ? ts.length : 0;
    const days = Math.round((new Date(d.due).getTime() - new Date(today).getTime()) / 86400000);
    const early = days > 0 ? `${days} day${days === 1 ? "" : "s"} before the deadline` : days === 0 ? "on deadline day, no drama" : "";
    return [{ id, text: line(id, [
      `“${d.title}” is DONE${n ? `, all ${n} task${n === 1 ? "" : "s"} ticked` : ""}${early ? `, ${early}` : ""}. Academic weapon behaviour 🎓🔥`,
      `${d.type} “${d.title}” ✅ finished${early ? ` ${early}` : ""}. Who said you couldn't? Not me, bestie 💅`,
      `Hurray!! “${d.title}” is off your plate${n ? ` (${n}/${n} tasks)` : ""}. Go have a snack, you earned it 🍰`,
    ]) }];
  });
}

/** Finance: this month's savings beat last month's full-month savings. One celebration per month. */
export function savingsWin(trend: { month: string; saved: number }[], month: string, fmt: (n: number) => string): Achievement[] {
  const now = trend[trend.length - 1], prev = trend[trend.length - 2];
  if (!now || !prev || now.saved <= 0 || now.saved <= prev.saved) return [];
  const id = `finance:saved-more:${month}`;
  const more = now.saved - Math.max(0, prev.saved);
  return [{ id, text: line(id, [
    `You've saved ${fmt(now.saved)} in ${now.month}, that's ${fmt(more)} more than all of ${prev.month} (${fmt(prev.saved)}). Rich girl era unlocked 💸`,
    `${fmt(now.saved)} saved this month vs ${fmt(prev.saved)} in ${prev.month}. ${fmt(more)} richer than last month you. Make it rain 🤑`,
    `Savings check: ${fmt(now.saved)} 💰 Already beat ${prev.month}'s ${fmt(prev.saved)} by ${fmt(more)}. Your wallet is screaming thank you 💖`,
  ]) }];
}

/** Mini goals: any goal marked done / achieved / complete. */
export function goalWins(goals: { goal: string; status: string; category: string }[]): Achievement[] {
  return goals.filter((g) => /done|achiev|complete/i.test(g.status)).map((g) => {
    const id = `goal:${slug(g.goal)}`;
    return { id, text: line(id, [
      `“${g.goal}” ACHIEVED 🏆 Manifested it, then actually did it. Iconic.`,
      `Mini goal “${g.goal}” ✔️ Told you so. Next one's already scared of you 🎈`,
      `Hurray! “${g.goal}” is officially done. Screenshot this, frame it, brag about it ✨`,
    ]) };
  });
}

/** Content: follower goals you set in the Follower Goals tab that are now reached. */
export function followerGoalWins(accounts: { channel: string; platform: string; followers: number | null; goal: number; goalSet: boolean }[]): Achievement[] {
  return accounts.filter((a) => a.goalSet && a.goal > 0 && (a.followers ?? 0) >= a.goal).map((a) => {
    const id = `content:${slug(a.channel)}:${slug(a.platform)}:${a.goal}`;
    const f = (a.followers ?? 0).toLocaleString("en-US"), g = a.goal.toLocaleString("en-US");
    return { id, text: line(id, [
      `${a.channel} on ${a.platform} hit ${f} followers, goal of ${g} smashed 💖 Influencer behaviour.`,
      `${f} followers on ${a.platform} (${a.channel})! You said ${g}, the internet said yes queen 💅`,
      `Goal reached: ${a.channel} ${a.platform} ${f}/${g} 🎀 Time to set a bigger one, superstar.`,
    ]) };
  });
}
