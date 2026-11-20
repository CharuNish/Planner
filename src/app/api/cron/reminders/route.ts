import { NextResponse } from "next/server";
import { loadEvents } from "@/lib/calendar";
import { config } from "@/lib/config";
import { addDays, daysBetween, todayISO } from "@/lib/dates";
import { analyseFinance, fmt, loadFinance, upcomingBills } from "@/lib/finance";
import { analyseStudies, loadStudies } from "@/lib/studies";
import { studyNudges } from "@/lib/nudges";
import { analyseMeasurements, analyseWeight, loadMeasurements, loadWeight } from "@/lib/life";
import { weightHype } from "@/lib/hype";
import { getOpportunities } from "@/lib/opportunities";
import { buildQueue, lastPosted, loadContentSheet, loadQueueFiles } from "@/lib/content";
import { contentFolderIsDemo, contentIsDemo } from "@/lib/config";

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
    const cal = await loadEvents(22).catch(() => ({ events: [] }));
    const nudges = studyNudges(a, s.tasks, cal.events).filter((n) => n.level !== "good").slice(0, 4);
    if (nudges.length) lines.push("", "🤖 Deadline bot:", ...nudges.map((n) => n.text));
  } catch { /* studies not connected */ }

  try {
    const [w, ms] = await Promise.all([loadWeight(), loadMeasurements().catch(() => ({ entries: [] }))]);
    const hype = weightHype(analyseWeight(w.entries), w.entries, analyseMeasurements(ms.entries));
    if (hype[0]) lines.push("", `💖 ${hype[0]}`);
  } catch { /* life sheet not connected */ }
  if (!contentIsDemo() || !contentFolderIsDemo()) {
    try {
      const [q, sheet] = await Promise.all([loadQueueFiles(), loadContentSheet()]);
      const queue = buildQueue(q.files, sheet.posts);
      const out: string[] = [];
      for (const acc of q.accounts) {
        const next = queue.find((x) => x.channel === acc.channel && x.platform === acc.platform);
        const left = queue.filter((x) => x.channel === acc.channel && x.platform === acc.platform).length;
        const since = lastPosted(sheet.posts, acc.channel, acc.platform);
        if (next) out.push(`• ${acc.channel} ${acc.platform}: "${sheet.captions.get(next.fileId)?.title || next.name}"${since === null ? "" : since === 0 ? " (already posted today)" : ` (last post ${since}d ago)`}${left > 1 ? ` +${left - 1} more` : ""}`);
        else if (since !== null && since >= 7) out.push(`• ${acc.channel} ${acc.platform}: nothing queued and no post for ${since} days. Add a video!`);
      }
      if (out.length) lines.push("", `🎬 To post today (${queue.length} left in total):`, ...out);
      const stats = sheet.posts.filter((p) => !p.views && daysBetween(p.date, today) >= 2 && daysBetween(p.date, today) <= 7 && p.platform !== "YouTube");
      if (stats.length) lines.push(`📝 Add views/likes for ${stats.length} recent post${stats.length > 1 ? "s" : ""} on the Content tab.`);
    } catch { /* content not connected */ }
  }

  const res = await fetch(`https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: config.telegram.chatId, text: lines.join("\n") }),
  });
  return NextResponse.json({ sent: res.ok });
}
