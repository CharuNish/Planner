"use server";
import { revalidatePath } from "next/cache";
import { config, contentIsDemo } from "@/lib/config";
import { todayISO } from "@/lib/dates";
import { appendRow, driveFile, updateRow } from "@/lib/google";
import { CHANNELS, PLATFORMS } from "@/lib/content";
import { writeCaption } from "@/lib/content-ai";
import type { Caption } from "@/lib/content";

type Result = { ok?: string; error?: string } | null;
const sheet = () => config.google.contentSheetId;
const need = () => (contentIsDemo() ? { error: "Connect your Content (or Life) sheet first (SETUP.md step 10)." } : null);

/** Writes captions + hashtags for one queued video and saves them to the Captions tab. */
export async function generateCaption(_: unknown, f: FormData): Promise<{ caption?: Caption & { watched: boolean }; error?: string } | null> {
  const fileId = String(f.get("fileId") || ""), channel = String(f.get("channel") || ""), platform = String(f.get("platform") || "");
  const note = String(f.get("note") || "").slice(0, 500);
  try {
    const meta = fileId.startsWith("demo") || fileId.startsWith("q:") ? { id: fileId, name: String(f.get("name") || "video.mp4"), mimeType: "video/mp4", createdTime: todayISO(), size: "0", description: "" } : await driveFile(fileId);
    const caption = await writeCaption({ fileId, name: meta.name, channel, platform, added: meta.createdTime.slice(0, 10), mimeType: meta.mimeType, size: Number(meta.size || 0), seconds: 0, description: meta.description || "", link: "", hasThumb: false }, note);
    if (!contentIsDemo()) {
      await appendRow(sheet(), "Captions", [fileId, meta.name, channel, platform, caption.title, caption.caption, caption.hashtags, caption.hook, caption.bestTime, caption.sinhala, caption.onScreen, todayISO()]);
      revalidatePath("/content");
    }
    return { caption };
  } catch (e) {
    const msg = String(e instanceof Error ? e.message : e);
    return { error: /429|quota|RESOURCE_EXHAUSTED/i.test(msg) ? "Gemini's free limit is used up for now. Try again in a while." : msg };
  }
}

/** "I posted it": moves the video out of the queue and starts tracking it. */
export async function markPosted(_: Result, f: FormData): Promise<Result> {
  const n = need(); if (n) return n;
  const platform = String(f.get("platform") || "");
  if (!PLATFORMS.includes(platform as never)) return { error: "Unknown platform." };
  try {
    await appendRow(sheet(), "Posts", [
      String(f.get("date") || todayISO()), String(f.get("channel") || ""), platform, String(f.get("title") || f.get("name") || ""), String(f.get("type") || ""),
      String(f.get("link") || ""), "", "", "", "", "", String(f.get("caption") || ""), String(f.get("hashtags") || ""), String(f.get("fileId") || ""), "",
    ]);
    const qrow = Number(f.get("row") || 0);
    if (qrow) await updateRow(sheet(), "Queue", qrow, { status: "Posted" });
  } catch (e) { return { error: String(e) }; }
  revalidatePath("/content"); revalidatePath("/");
  return { ok: "Marked as posted 🎉" };
}

/** Saves views/likes etc. for a posted video. */
export async function updateStats(_: Result, f: FormData): Promise<Result> {
  const n = need(); if (n) return n;
  const row = Number(f.get("row"));
  if (!row || row < 2) return { error: "Missing row." };
  const vals: Record<string, unknown> = {};
  for (const k of ["views", "likes", "comments", "shares", "saves", "link"]) { const v = String(f.get(k) ?? "").trim(); if (v !== "") vals[k] = k === "link" ? v : Number(v.replace(/[^0-9.]/g, "")); }
  try { await updateRow(sheet(), "Posts", row, vals); } catch (e) { return { error: String(e) }; }
  revalidatePath("/content");
  return { ok: "Updated ✓" };
}

/** Logs follower counts for several accounts at once. */
export async function logFollowers(_: Result, f: FormData): Promise<Result> {
  const n = need(); if (n) return n;
  const date = String(f.get("date") || todayISO());
  const rows = [...f.entries()].filter(([k, v]) => k.startsWith("f:") && String(v).trim()).map(([k, v]) => { const [channel, platform] = k.slice(2).split("|"); return [date, channel, platform, Number(String(v).replace(/[^0-9]/g, ""))]; });
  if (!rows.length) return { error: "Enter at least one number." };
  try { for (const r of rows) await appendRow(sheet(), "Followers", r); } catch (e) { return { error: String(e) }; }
  revalidatePath("/content");
  return { ok: `Saved ${rows.length} follower count${rows.length > 1 ? "s" : ""} ✓` };
}

/** Adds video names to the Queue tab (one row per account ticked). The video itself stays on your phone/laptop. */
export async function addToQueue(_: Result, f: FormData): Promise<Result> {
  const n = need(); if (n) return n;
  const names = String(f.get("names") || "").split("\n").map((x) => x.trim()).filter(Boolean);
  const accounts = f.getAll("account").map(String).filter((a) => { const [c, p] = a.split("|"); return CHANNELS.includes(c as never) && PLATFORMS.includes(p as never); });
  if (!names.length) return { error: "Type at least one video name." };
  if (!accounts.length) return { error: "Tick at least one account." };
  const note = String(f.get("note") || "");
  try {
    for (const name of names) for (const a of accounts) { const [c, p] = a.split("|"); await appendRow(sheet(), "Queue", [name, c, p, note, todayISO(), "", "Video"]); }
  } catch (e) { return { error: String(e) }; }
  revalidatePath("/content");
  const total = names.length * accounts.length;
  return { ok: `Added ${total} to your queue ✓` };
}

/** Takes a video off the queue without posting it. */
export async function skipQueued(f: FormData) {
  const row = Number(f.get("row"));
  if (contentIsDemo() || !row) return;
  await updateRow(sheet(), "Queue", row, { status: "Skipped" });
  revalidatePath("/content");
}
