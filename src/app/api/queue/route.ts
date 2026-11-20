import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { config, contentIsDemo } from "@/lib/config";
import { todayISO } from "@/lib/dates";
import { appendRow, readSheet, str } from "@/lib/google";
import { CHANNELS, PLATFORMS } from "@/lib/content";

// Your MacBook's Content Sync helper calls this to add new videos/posts to the Queue tab.
// It only ever ADDS rows: deleting a file on your Mac never removes it from the sheet.
export async function POST(req: Request) {
  if (!config.cronSecret || req.headers.get("authorization") !== `Bearer ${config.cronSecret}`) {
    return NextResponse.json({ error: "Wrong key. Use the same CRON_SECRET you put in Vercel." }, { status: 401 });
  }
  if (contentIsDemo()) return NextResponse.json({ error: "Connect your Life sheet first (LIFE_SHEET_ID)." }, { status: 400 });
  const f = await req.formData();
  const name = str(f.get("name")).slice(0, 200), type = str(f.get("type")) || "Video", note = str(f.get("note")).slice(0, 1000);
  const channel = CHANNELS.find((c) => c.toLowerCase() === str(f.get("channel")).toLowerCase());
  const platform = PLATFORMS.find((p) => p.toLowerCase() === str(f.get("platform")).toLowerCase());
  if (!name) return NextResponse.json({ error: "missing name" }, { status: 400 });
  if (!channel || !platform) return NextResponse.json({ error: `Folder must be named like "Life with C - Instagram". Got "${str(f.get("channel"))} - ${str(f.get("platform"))}".` }, { status: 400 });
  const sheetId = config.google.contentSheetId;
  try {
    const rows = await readSheet(sheetId, "Queue");
    const exists = rows.some((r) => str(r["video"]).toLowerCase() === name.toLowerCase() && str(r["channel"]) === channel && str(r["platform"]) === platform);
    if (exists) return NextResponse.json({ ok: true, skipped: "already in the queue" });
    await appendRow(sheetId, "Queue", [name, channel, platform, note, todayISO(), "", type]);
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
  revalidatePath("/content");
  return NextResponse.json({ ok: true, added: name });
}
