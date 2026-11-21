import { NextResponse } from "next/server";
import { runTick } from "@/lib/bot";
import { config } from "@/lib/config";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// The bot's alarm clock. A free pinger (cron-job.org) calls this every 5 minutes, and Vercel calls it
// a few times a day as a backup (see vercel.json). Each call sends the Telegram message that's due
// right now (morning / midday / evening / night, at the times you picked on the Home page), once.
// Protected by CRON_SECRET: send "Authorization: Bearer <secret>" or add ?key=<secret> to the link.
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (config.cronSecret && req.headers.get("authorization") !== `Bearer ${config.cronSecret}` && key !== config.cronSecret) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  try { return NextResponse.json(await runTick()); }
  catch (e) { return NextResponse.json({ error: String(e).slice(0, 300) }, { status: 500 }); }
}
