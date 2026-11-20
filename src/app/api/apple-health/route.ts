import { NextResponse } from "next/server";
import { config, lifeIsDemo } from "@/lib/config";
import { inputFromBody, saveHealthDay, tickGymFromWatch } from "@/lib/health";

export const maxDuration = 30;

// The iPhone Shortcut posts today's Apple Watch numbers here every night (see APPLE-WATCH.md).
// It must send the secret key (HEALTH_KEY, or CRON_SECRET if that isn't set) as "key" in the JSON,
// or as an "Authorization: Bearer <key>" header.
export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "The Shortcut didn't send JSON. In 'Get Contents of URL', set Request Body to JSON." }, { status: 400 });
  }
  const key = String(body.key ?? "").trim() || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!config.healthKey) return NextResponse.json({ ok: false, error: "Set HEALTH_KEY in Vercel first (APPLE-WATCH.md step 1)." }, { status: 500 });
  if (key !== config.healthKey) return NextResponse.json({ ok: false, error: "Wrong key. Check the 'key' field in the Shortcut matches HEALTH_KEY in Vercel." }, { status: 401 });
  if (lifeIsDemo()) return NextResponse.json({ ok: false, error: "The Life sheet isn't connected yet (LIFE_SHEET_ID)." }, { status: 500 });

  try {
    const day = inputFromBody(body);
    const saved = await saveHealthDay(day);
    const gym = await tickGymFromWatch(day).catch(() => false);
    const steps = day.steps !== null ? `${day.steps.toLocaleString("en-US")} steps` : "no steps";
    const msg = `✅ Saved ${day.date}: ${steps}, ${day.workouts.length} workout${day.workouts.length === 1 ? "" : "s"}${gym ? " (gym ticked 🏋️‍♀️)" : ""}. Bestie bot is watching 👀`;
    return NextResponse.json({ ok: true, saved, gymTicked: gym, message: msg, day });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e).slice(0, 300) }, { status: 500 });
  }
}

// Opening the link in a browser just says it's alive.
export async function GET() {
  return NextResponse.json({ ok: true, message: "Apple Watch sync is ready. The Shortcut sends data here with POST." });
}
