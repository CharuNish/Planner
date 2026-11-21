import { NextResponse } from "next/server";
import { runTick } from "@/lib/bot";
import { config } from "@/lib/config";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// The bot's alarm clock. Vercel calls this once around each message time (see vercel.json).
// Each call sends the Telegram message that's due right now (morning / midday / evening / night,
// times fixed in src/lib/bot.ts), once a day each. ?slot= in vercel.json is just a label.
// Protected by CRON_SECRET: send "Authorization: Bearer <secret>" or add ?key=<secret> to the link.
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (config.cronSecret && req.headers.get("authorization") !== `Bearer ${config.cronSecret}` && key !== config.cronSecret) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  try { return NextResponse.json(await runTick()); }
  catch (e) { return NextResponse.json({ error: String(e).slice(0, 300) }, { status: 500 }); }
}
