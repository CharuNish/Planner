"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { calendarIsDemo, config, financeIsDemo, lifeIsDemo, studiesIsDemo } from "@/lib/config";
import { addDays, parseDate, todayISO } from "@/lib/dates";
import { appendRow, appendRowCreatingTab, ensureTab, insertEvent, num, readSheetRows, str, updateRow } from "@/lib/google";

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

export async function logMeasurements(_: Result, f: FormData): Promise<Result> {
  const n = needLife(); if (n) return n;
  const keys = ["chest", "waist", "belly", "hip", "arms", "thigh"];
  const vals = keys.map((k) => { const v = Number(f.get(k)); return v > 0 && v < 300 ? v : ""; });
  if (vals.every((v) => v === "")) return { error: "Enter at least one measurement in cm." };
  try { await appendRow(config.google.lifeSheetId, "Measurements", [String(f.get("date") || todayISO()), ...vals, String(f.get("notes") || "")]); }
  catch (e) { return { error: String(e) }; }
  revalidatePath("/weight");
  return { ok: "Saved ✓ Look at that outline go!" };
}

export async function setCountdown(_: Result, f: FormData): Promise<Result> {
  const n = needLife(); if (n) return n;
  const date = String(f.get("date") || ""), label = String(f.get("label") || "").trim().slice(0, 60);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Pick a date." };
  // Saved as text ('2027-01-01) so Google Sheets doesn't turn it into a number.
  try { await appendRowCreatingTab(config.google.lifeSheetId, "Settings", ["Setting", "Value", "Label"], ["countdown", `'${date}`, label || "Countdown"]); }
  catch (e) { return { error: String(e) }; }
  revalidatePath("/");
  return { ok: "Countdown updated ✓" };
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

/** Logs ONE habit (sleep, water, gym or a note) into that day's row of the Habits tab.
 *  If the day already has a row, only that habit's cell is changed, so the other habits stay as they were. */
export async function logHabit(_: Result, f: FormData): Promise<Result> {
  const n = needLife(); if (n) return n;
  const habit = String(f.get("habit") || "");
  const date = String(f.get("date") || todayISO());
  const sheet = config.google.lifeSheetId;
  let rows: Awaited<ReturnType<typeof readSheetRows>> = [];
  try { rows = await readSheetRows(sheet, "Habits"); } catch (e) { return { error: String(e) }; }
  const dayRows = rows.filter((r) => parseDate(r["date"]) === date);
  const existing = dayRows[dayRows.length - 1];
  const head = (want: string, alt: string) => (existing && alt in existing && !(want in existing) ? alt : want);
  const cols = { sleep: head("sleep (h)", "sleep"), water: head("water (glasses)", "water"), gym: "gym", notes: "notes" };

  let key: string, value: string | number, ok: string;
  if (habit === "sleep") {
    const h = Number(f.get("value"));
    if (!(h > 0 && h <= 24)) return { error: "Enter hours slept (e.g. 7.5)." };
    key = cols.sleep; value = h; ok = `😴 ${h} h of sleep saved`;
  } else if (habit === "water") {
    // "add" = tap +1 glass; otherwise set the day's total
    let current = 0;
    for (const r of dayRows) { const v = str(r[cols.water]); if (v) current = num(v); }
    const add = Number(f.get("add") || 0);
    const total = add ? current + add : Number(f.get("value"));
    if (!(total >= 0) || (!add && !str(f.get("value")))) return { error: "Enter how many glasses." };
    key = cols.water; value = total; ok = `💧 ${total} glass${total === 1 ? "" : "es"} today`;
  } else if (habit === "gym") {
    const went = f.get("value") === "Yes";
    key = cols.gym; value = went ? "Yes" : "No"; ok = went ? "🏋️ Gym day logged, look at you!" : "🛋️ Rest day logged";
  } else if (habit === "notes") {
    const note = String(f.get("value") || "").trim();
    if (!note) return { error: "Write a note first." };
    key = cols.notes; value = note; ok = "📝 Note saved";
  } else return { error: "Unknown habit." };

  try {
    if (existing) await updateRow(sheet, "Habits", Number(existing.__row), { [key]: value });
    else {
      const row: (string | number)[] = [date, "", "", "", ""];
      row[{ [cols.sleep]: 1, [cols.water]: 2, gym: 3, notes: 4 }[key] ?? 4] = value;
      await appendRow(sheet, "Habits", row);
    }
  } catch (e) { return { error: String(e) }; }
  revalidatePath("/", "layout");
  return { ok };
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
  revalidatePath("/updates");
  return { ok: f.get("calendar") && deadline ? "Saved, and the deadline is in your calendar ✓" : "Saved ✓" };
}

// "Try again" for a daily feed that failed (forces one fresh attempt).
const RETRYABLE = ["github-trending", "papers", "medium", "youtube", "opportunities"];
export async function retryDaily(f: FormData) {
  const key = String(f.get("key") || "");
  if (!RETRYABLE.includes(key)) return;
  revalidateTag(`daily-${key}`);
  revalidatePath("/updates"); revalidatePath("/content");
}

// ───── Goal photos ─────
/** Uploads a photo for one mini goal to Vercel Blob and remembers it in the auto-made "GoalPhotos" tab. */
export async function setGoalPhoto(_: Result, f: FormData): Promise<Result> {
  const n = needLife(); if (n) return n;
  const goal = String(f.get("goal") || "").trim();
  if (!goal) return { error: "Which goal is this for?" };
  const file = f.get("photo");
  if (!(file instanceof File) || !file.size) return { error: "Pick a photo first." };
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { error: "Photo uploads need the free Vercel Blob storage switched on first (SETUP.md, 'Wins photos')." };
  if (file.size > 4 * 1024 * 1024) return { error: "That photo is too big (max 4 MB)." };
  let url = "";
  try {
    const { put } = await import("@vercel/blob");
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const blob = await put(`goals/${goal.slice(0, 40).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.${ext}`, file, { access: "public", addRandomSuffix: true, contentType: file.type || "image/jpeg" });
    url = blob.url;
  } catch (e) { return { error: `Photo upload failed: ${String(e).slice(0, 160)}` }; }
  try {
    const { GOAL_PHOTOS_TAB } = await import("@/lib/life");
    await appendRowCreatingTab(config.google.lifeSheetId, GOAL_PHOTOS_TAB, ["Goal", "Photo", "Updated"], [goal, url, todayISO()]);
  } catch (e) { return { error: String(e) }; }
  revalidatePath("/goals");
  return { ok: "Looking cute ✨" };
}

// ───── Wins ─────
export async function addWin(_: Result, f: FormData): Promise<Result> {
  const n = needLife(); if (n) return n;
  const text = String(f.get("text") || "").trim();
  if (!text) return { error: "What did you do? Write it down, queen 👑" };
  const date = String(f.get("date") || todayISO());
  let photo = String(f.get("photoUrl") || "").trim();
  const file = f.get("photo");
  if (file instanceof File && file.size > 0) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) return { error: "Photo uploads need the free Vercel Blob storage switched on first (SETUP.md, 'Wins photos'). You can save the win without a photo for now." };
    if (file.size > 4 * 1024 * 1024) return { error: "That photo is too big (max 4 MB)." };
    try {
      const { put } = await import("@vercel/blob");
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const blob = await put(`wins/${date}-${text.slice(0, 30).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.${ext}`, file, { access: "public", addRandomSuffix: true, contentType: file.type || "image/jpeg" });
      photo = blob.url;
    } catch (e) { return { error: `Photo upload failed: ${String(e).slice(0, 160)}` }; }
  }
  try { await appendRowCreatingTab(config.google.lifeSheetId, "Wins", ["Date", "Win", "Category", "Photo"], [date, text, String(f.get("category") || "Other"), photo]); }
  catch (e) { return { error: String(e) }; }
  revalidatePath("/", "layout");
  return { ok: "Saved! I'll brag about this in tomorrow's morning message 😘" };
}

/** Sends the morning bestie message right now (to test it). */
export async function sendMorningNow(): Promise<Result> {
  try {
    const { buildMorningMessage, sendTelegram } = await import("@/lib/morning");
    const m = await buildMorningMessage();
    await sendTelegram(m.text);
    return { ok: "Sent! Check Telegram 💌" };
  } catch (e) { return { error: String(e).slice(0, 200) }; }
}

export async function logWorkout(_: Result, f: FormData): Promise<Result> {
  const n = needLife(); if (n) return n;
  const type = String(f.get("type") || "").trim();
  const minutes = Math.round(Number(f.get("minutes") || 0));
  if (!type) return { error: "Pick what you trained 💪" };
  if (!(minutes > 0)) return { error: "How many minutes?" };
  try {
    const { logManualWorkout } = await import("@/lib/health");
    const gym = await logManualWorkout(String(f.get("date") || todayISO()), type, minutes, String(f.get("notes") || ""));
    revalidatePath("/", "layout");
    return { ok: `${type} ${minutes} min saved${gym ? ", gym ticked 🏋️‍♀️" : ""}. Look at you go!` };
  } catch (e) { return { error: String(e) }; }
}

// ───── Home to-dos (Life sheet "Todos" tab: Added | Task | Priority | Done | Done On) ─────
const TODO_TAB = "Todos";
const TODO_HEAD = ["Added", "Task", "Priority", "Done", "Done On"];

export async function addTodo(_: Result, f: FormData): Promise<Result> {
  const n = needLife(); if (n) return n;
  const task = String(f.get("task") || "").trim().slice(0, 200);
  if (!task) return { error: "Write what you need to do first 📝" };
  const p = String(f.get("priority") || "Medium");
  const priority = ["High", "Medium", "Low"].includes(p) ? p : "Medium";
  const sheet = config.google.lifeSheetId;
  try {
    // First time only: creates the tab with bold headers and dropdowns for Priority and Done.
    await ensureTab(sheet, TODO_TAB, TODO_HEAD, { Priority: ["High", "Medium", "Low"], Done: ["Yes", "No"] });
    await appendRow(sheet, TODO_TAB, [todayISO(), task, priority, "No", ""]);
  } catch (e) { return { error: String(e) }; }
  revalidatePath("/");
  return { ok: priority === "High" ? "Added to the top 🔥" : "Added ✓" };
}

/** Ticks a to-do off: Done = Yes and today's date in Done On. It then disappears from Home (the row stays in the sheet). */
export async function completeTodo(row: number, task: string): Promise<{ ok?: string; error?: string }> {
  const n = needLife(); if (n) return n;
  const sheet = config.google.lifeSheetId;
  try {
    // Make sure the row still holds this to-do (in case rows were moved in the sheet since the page loaded).
    const rows = await readSheetRows(sheet, TODO_TAB);
    const match = rows.find((r) => Number(r.__row) === row && str(r["task"]) === task) || rows.find((r) => str(r["task"]) === task && !/^(y|yes|true|1|✓|✔|done|x)$/i.test(str(r["done"])));
    if (!match) return { error: "Couldn't find that to-do in your sheet. Refresh the page and try again." };
    await updateRow(sheet, TODO_TAB, Number(match.__row), { done: "Yes", "done on": todayISO() });
  } catch (e) { return { error: String(e) }; }
  revalidatePath("/");
  return { ok: "Done ✓" };
}

export async function logSteps(_: Result, f: FormData): Promise<Result> {
  const n = needLife(); if (n) return n;
  const steps = Math.round(Number(String(f.get("steps") || "").replace(/[^0-9.]/g, "")));
  if (!(steps > 0)) return { error: "How many steps? 👟" };
  try {
    const { saveSteps } = await import("@/lib/health");
    await saveSteps(String(f.get("date") || todayISO()), steps);
    revalidatePath("/weight");
    return { ok: `${steps.toLocaleString("en-US")} steps saved 👟` };
  } catch (e) { return { error: String(e) }; }
}

export async function syncBills(_: Result): Promise<Result> {
  try {
    const { syncBillsToCalendar } = await import("@/lib/billsync");
    const r = await syncBillsToCalendar();
    if (r.error) return { error: r.error };
    revalidatePath("/", "layout");
    const parts = [r.added && `${r.added} added`, r.updated && `${r.updated} updated`, r.removed && `${r.removed} removed`].filter(Boolean);
    return { ok: parts.length ? `Calendar updated ✓ (${parts.join(", ")})` : "Your calendar already has all your bills ✓" };
  } catch (e) { return { error: String(e).slice(0, 300) }; }
}
