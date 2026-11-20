"use server";
import { revalidatePath } from "next/cache";
import { calendarIsDemo, config, financeIsDemo, studiesIsDemo } from "@/lib/config";
import { addDays, todayISO } from "@/lib/dates";
import { appendRow, insertEvent } from "@/lib/google";

type Result = { ok?: string; error?: string } | null;

export async function addTransaction(_: Result, f: FormData): Promise<Result> {
  if (financeIsDemo()) return { error: "Connect your finance sheet first (see SETUP.md)." };
  const amount = Number(f.get("amount"));
  if (!amount || amount <= 0) return { error: "Enter an amount." };
  try {
    await appendRow(config.google.financeSheetId, "Transactions", [
      String(f.get("date") || todayISO()), String(f.get("type") || "Expense"), String(f.get("category") || "Other"),
      amount, String(f.get("description") || ""), String(f.get("method") || ""),
    ]);
  } catch (e) { return { error: String(e) }; }
  revalidatePath("/", "layout");
  return { ok: "Saved to your sheet ✓" };
}

export async function logStudy(_: Result, f: FormData): Promise<Result> {
  if (studiesIsDemo()) return { error: "Connect your studies sheet first (see SETUP.md)." };
  const hours = Number(f.get("hours"));
  if (!hours || hours <= 0) return { error: "Enter hours studied." };
  try {
    await appendRow(config.google.studiesSheetId, "StudyLog", [String(f.get("date") || todayISO()), hours, String(f.get("subject") || ""), String(f.get("notes") || "")]);
  } catch (e) { return { error: String(e) }; }
  revalidatePath("/", "layout");
  return { ok: "Logged ✓ Nice work!" };
}

export async function addEvent(_: Result, f: FormData): Promise<Result> {
  if (calendarIsDemo()) return { error: "Connect your Google Calendar first (see SETUP.md)." };
  const title = String(f.get("title") || "").trim();
  const date = String(f.get("date") || "");
  const time = String(f.get("time") || "");
  const category = String(f.get("category") || "Event");
  const minutes = Number(f.get("duration") || 60);
  if (!title || !date) return { error: "Add a title and date." };
  const summary = `[${category}] ${title}`;
  const event = time
    ? { summary, start: { dateTime: `${date}T${time}:00`, timeZone: config.timezone }, end: { dateTime: endTime(date, time, minutes), timeZone: config.timezone } }
    : { summary, start: { date }, end: { date: addDays(date, 1) } };
  const repeat = String(f.get("repeat") || "");
  if (repeat) Object.assign(event, { recurrence: [`RRULE:FREQ=${repeat}`] });
  try {
    await insertEvent(config.google.calendarIds[0], event);
  } catch (e) { return { error: String(e) }; }
  revalidatePath("/", "layout");
  return { ok: "Added to your Google Calendar ✓" };
}

function endTime(date: string, time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const d = addDays(date, Math.floor(total / 1440));
  const t = total % 1440;
  return `${d}T${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}:00`;
}
