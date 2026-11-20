"use server";
import { revalidatePath } from "next/cache";
import { config, contentIsDemo } from "@/lib/config";
import { todayISO } from "@/lib/dates";
import { appendRow } from "@/lib/google";

type Result = { ok?: string; error?: string } | null;

/** Logs follower counts for several accounts at once (adds rows to the Followers tab). */
export async function logFollowers(_: Result, f: FormData): Promise<Result> {
  if (contentIsDemo()) return { error: "Connect your Life sheet first (LIFE_SHEET_ID)." };
  const date = String(f.get("date") || todayISO());
  const rows = [...f.entries()].filter(([k, v]) => k.startsWith("f:") && String(v).trim()).map(([k, v]) => { const [channel, platform] = k.slice(2).split("|"); return [date, channel, platform, Number(String(v).replace(/[^0-9]/g, ""))]; });
  if (!rows.length) return { error: "Enter at least one number." };
  try { for (const r of rows) await appendRow(config.google.contentSheetId, "Followers", r); } catch (e) { return { error: String(e) }; }
  revalidatePath("/content");
  return { ok: `Saved ${rows.length} follower count${rows.length > 1 ? "s" : ""} 💖` };
}
