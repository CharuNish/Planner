import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getOpportunities } from "@/lib/opportunities";
import { buildMorningMessage, sendTelegram } from "@/lib/morning";

export const maxDuration = 60;

// Runs every morning at 7 AM Sri Lanka time (see vercel.json) and sends your bestie-style
// Telegram message: yesterday's recap + today's to-do list (built in src/lib/morning.ts).
// Add ?dry=1 to see the message without sending it (needs the CRON_SECRET header like the cron).
export async function GET(req: Request) {
  if (config.cronSecret && req.headers.get("authorization") !== `Bearer ${config.cronSecret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  // Fetch today's opportunities now so the tab loads instantly (once a day).
  if (!dry) await getOpportunities().catch(() => null);
  const m = await buildMorningMessage();
  if (dry) return NextResponse.json(m);
  if (!config.telegram.botToken || !config.telegram.chatId) return NextResponse.json({ skipped: "Telegram not set up" });
  try { await sendTelegram(m.text); } catch (e) { return NextResponse.json({ sent: false, error: String(e) }, { status: 500 }); }
  return NextResponse.json({ sent: true, ai: m.ai, aiError: m.aiError });
}
