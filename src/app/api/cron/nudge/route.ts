import { NextResponse } from "next/server";
import { loadEvents } from "@/lib/calendar";
import { config } from "@/lib/config";
import { studyNudges } from "@/lib/nudges";
import { analyseStudies, loadStudies } from "@/lib/studies";

export const maxDuration = 30;

// Extra Telegram nudges during the day (1 PM and 8 PM Sri Lanka time, see vercel.json).
// Only sends when there's something to push you on: an unfinished study goal or a close deadline.
export async function GET(req: Request) {
  if (config.cronSecret && req.headers.get("authorization") !== `Bearer ${config.cronSecret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  if (!config.telegram.botToken || !config.telegram.chatId) return NextResponse.json({ skipped: "Telegram not set up" });
  const slot = new URL(req.url).searchParams.get("slot") === "evening" ? "evening" : "afternoon";
  try {
    const s = await loadStudies();
    if (s.demo) return NextResponse.json({ skipped: "studies sheet not connected" });
    const a = analyseStudies(s.deadlines, s.tasks, s.log, s.targets);
    const cal = await loadEvents(22).catch(() => ({ events: [] }));
    const all = studyNudges(a, s.tasks, cal.events);
    const urgent = all.filter((n) => n.level === "fire" || (slot === "afternoon" && n.level === "warn"));
    if (!urgent.length) return NextResponse.json({ skipped: "nothing urgent, she's doing great" });
    const head = slot === "afternoon"
      ? `🕐 Midday check-in, ${config.ownerName}. Half the day is gone.`
      : `🌙 Evening check, ${config.ownerName}. Last chance for today.`;
    const text = [head, "", ...urgent.slice(0, 3).map((n) => n.text)].join("\n");
    const res = await fetch(`https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: config.telegram.chatId, text }),
    });
    return NextResponse.json({ sent: res.ok });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
