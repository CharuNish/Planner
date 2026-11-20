"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { calendarIsDemo, config, financeIsDemo, lifeIsDemo, studiesIsDemo } from "@/lib/config";
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

// ───── Stage 2: Life sheet ─────

const needLife = () => (lifeIsDemo() ? { error: "Connect your Life sheet first (see SETUP.md)." } : null);

export async function logWeight(_: Result, f: FormData): Promise<Result> {
  const n = needLife(); if (n) return n;
  const kg = Number(f.get("kg"));
  if (!kg || kg < 20 || kg > 300) return { error: "Enter your weight in kg." };
  try { await appendRow(config.google.lifeSheetId, "Weight", [String(f.get("date") || todayISO()), kg, String(f.get("notes") || "")]); }
  catch (e) { return { error: String(e) }; }
  revalidatePath("/", "layout");
  return { ok: "Saved ✓ Proud of you for checking in!" };
}

export async function markRecipeMade(_: Result, f: FormData): Promise<Result> {
  const n = needLife(); if (n) return n;
  const recipe = String(f.get("recipe") || "");
  if (!recipe) return { error: "Missing recipe." };
  try {
    await appendRow(config.google.lifeSheetId, "RecipeLog", [todayISO(), recipe, String(f.get("link") || ""), Number(f.get("rating") || 0) || "", String(f.get("comment") || "")]);
  } catch (e) { return { error: String(e) }; }
  revalidatePath("/weight");
  return { ok: "Added to your cooking log 🍳" };
}

export async function habitCheckIn(_: Result, f: FormData): Promise<Result> {
  const n = needLife(); if (n) return n;
  const sleep = String(f.get("sleep") || ""), water = String(f.get("water") || "");
  const gym = f.get("gym") ? "Yes" : "No";
  try { await appendRow(config.google.lifeSheetId, "Habits", [String(f.get("date") || todayISO()), sleep, water, gym, String(f.get("notes") || "")]); }
  catch (e) { return { error: String(e) }; }
  revalidatePath("/", "layout");
  return { ok: "Checked in ✓" };
}

export async function saveOpportunity(_: Result, f: FormData): Promise<Result> {
  const n = needLife(); if (n) return n;
  const title = String(f.get("title") || ""), deadline = String(f.get("deadline") || "");
  try {
    await appendRow(config.google.lifeSheetId, "Opportunities", [title, String(f.get("type") || ""), String(f.get("org") || ""), deadline, String(f.get("link") || ""), "Interested", ""]);
    if (f.get("calendar") && deadline && !calendarIsDemo()) {
      await insertEvent(config.google.calendarIds[0], { summary: `[Deadline] Apply: ${title}`, description: String(f.get("link") || ""), start: { date: deadline }, end: { date: addDays(deadline, 1) } });
    }
  } catch (e) { return { error: String(e) }; }
  revalidatePath("/opportunities");
  return { ok: f.get("calendar") && deadline ? "Saved, and the deadline is in your calendar ✓" : "Saved ✓" };
}

// "Try again" for a daily feed that failed (forces one fresh attempt).
const RETRYABLE = ["github-trending", "papers", "medium", "youtube", "opportunities", "content-ideas", "content-trends", "my-youtube"];
export async function retryDaily(f: FormData) {
  const key = String(f.get("key") || "");
  if (!RETRYABLE.includes(key)) return;
  revalidateTag(`daily-${key}`);
  revalidatePath("/updates"); revalidatePath("/opportunities"); revalidatePath("/content");
}
