import { NextResponse } from "next/server";
import { loadEvents } from "@/lib/calendar";
import { config } from "@/lib/config";
import { addDays, daysBetween, todayISO } from "@/lib/dates";
import { analyseFinance, fmt, loadFinance, upcomingBills } from "@/lib/finance";
import { analyseStudies, loadStudies } from "@/lib/studies";
import { getOpportunities } from "@/lib/opportunities";

export const maxDuration = 60;

// Runs every morning (see vercel.json) and sends you a Telegram message.
export async function GET(req: Request) {
  if (config.cronSecret && req.headers.get("authorization") !== `Bearer ${config.cronSecret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  // Fetch today's opportunities now so the tab loads instantly (once a day).
  await getOpportunities().catch(() => null);
  if (!config.telegram.botToken || !config.telegram.chatId) return NextResponse.json({ skipped: "Telegram not set up" });

  const today = todayISO();
  const lines: string[] = [`☀️ Good morning ${config.ownerName}! Here's your day:`];
  try {
    const { events } = await loadEvents(2);
    const t = events.filter((e) => e.date === today);
    lines.push("", "📅 Today:", ...(t.length ? t.map((e) => `• ${e.time ?? "All day"} ${e.title}`) : ["• Nothing scheduled"]));
    const tm = events.filter((e) => e.date === addDays(today, 1) && /Exam|Deadline|Bill/.test(e.category));
    if (tm.length) lines.push("", "⏰ Tomorrow:", ...tm.map((e) => `• ${e.title}`));
  } catch { /* calendar not connected */ }
  try {
    const f = await loadFinance();
    const bills = upcomingBills(f.bills, 3);
    if (bills.length) lines.push("", "🧾 Bills due soon:", ...bills.map((b) => `• ${b.name} ${fmt(b.amount)} (${daysBetween(today, b.due) === 0 ? "today" : `in ${daysBetween(today, b.due)}d`})`));
    const a = analyseFinance(f.txns, f.budgets);
    lines.push("", `💰 Budget left: ${fmt(a.budgetLeft)} (≈ ${fmt(a.perDayAllowance)}/day)`);
  } catch { /* finance not connected */ }
  try {
    const s = await loadStudies();
    const a = analyseStudies(s.deadlines, s.tasks, s.log, s.targets);
    const soon = a.deadlineStatus.filter((d) => d.daysLeft <= 7);
    if (soon.length) lines.push("", "📚 Deadlines this week:", ...soon.map((d) => `• ${d.title}: ${d.daysLeft}d (${d.status})`));
    if (a.priorities[0]) lines.push("", `⭐ Study first: ${a.priorities[0].task}`);
  } catch { /* studies not connected */ }

  const res = await fetch(`https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: config.telegram.chatId, text: lines.join("\n") }),
  });
  return NextResponse.json({ sent: res.ok });
}
