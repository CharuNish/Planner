import { createHash } from "crypto";
import { calendarIsDemo, config, financeIsDemo } from "./config";
import { addDays, todayISO } from "./dates";
import { billDueDates, billKey, billRule, fmt, loadFinance, matchBillPayments, type Bill, type Txn } from "./finance";
import { deleteEvent, insertEvent, listTaggedEvents, updateEvent } from "./google";

// Puts every bill from the Bills tab of your Finance sheet into your Google Calendar
// as an all-day event that repeats by its Frequency (so it shows up every month, etc.).
// The sheet is the boss: change a bill there and the calendar event follows on the next sync.
// Remove a row and its calendar event is removed too. Your sheet is only read, never changed.
// Once you record the expense for a due date (see matchBillPayments in finance.ts), that one day is taken
// off the calendar; the later repeats stay.

const TAG = "plannerBill";

const hash = (s: string) => createHash("sha1").update(s).digest("hex");
// Google event ids may only use 0-9 and a-v, so a hex hash works. Same bill name = same event, so no duplicates.
const eventId = (b: Bill) => "pbill" + hash(b.name.trim().toLowerCase()).slice(0, 26);

function rrule(b: Bill, paidDays: string[]): string[] {
  const r = billRule(b.frequency);
  if (r.unit === "once") return [];
  // End Date set? The repeating event stops on that day.
  const until = b.endDate ? `;UNTIL=${b.endDate.replace(/-/g, "")}` : "";
  // Already paid days are skipped (EXDATE), so only that one repeat disappears from the calendar.
  const skip = paidDays.length ? [`EXDATE;VALUE=DATE:${paidDays.map((d) => d.replace(/-/g, "")).join(",")}`] : [];
  return [...rruleBase(b, r).map((x) => x + until), ...skip];
}

function rruleBase(b: Bill, r: ReturnType<typeof billRule>): string[] {
  if (r.unit === "day") return [r.every % 7 === 0 ? `RRULE:FREQ=WEEKLY;INTERVAL=${r.every / 7}` : `RRULE:FREQ=DAILY;INTERVAL=${r.every}`];
  const day = Number(b.nextDue.slice(8, 10));
  const base = r.every % 12 === 0 ? `RRULE:FREQ=YEARLY;INTERVAL=${r.every / 12}` : `RRULE:FREQ=MONTHLY;INTERVAL=${r.every}`;
  // Due on the 29th-31st? Use the last day of short months instead of skipping them (same as the website does).
  if (day > 28) {
    const days = Array.from({ length: day - 27 }, (_, i) => 28 + i).join(",");
    return [r.every % 12 === 0 ? base : `${base};BYMONTHDAY=${days};BYSETPOS=-1`];
  }
  return [base];
}

function eventFor(b: Bill, paidDays: string[]) {
  const kind = b.type === "Subscription" ? "Subscription" : b.type === "Payment" ? "Payment" : "Bill";
  const body = {
    summary: `🧾 ${b.name} · ${fmt(b.amount)}`,
    description: `${kind}${b.category ? ` · ${b.category}` : ""} · ${b.frequency || "Monthly"}${b.endDate ? ` until ${b.endDate}` : ""}\n\nAdded by your planner from the Bills tab of your Finance sheet. To change or remove it, edit the sheet (changes here get overwritten).`,
    start: { date: b.nextDue },
    end: { date: addDays(b.nextDue, 1) },
    recurrence: rrule(b, paidDays),
    transparency: "transparent", // shows as "free", so it doesn't make your day look busy
    colorId: "5", // yellow
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 15 * 60 }] }, // 9:00 AM the day before
  };
  const fingerprint = hash(JSON.stringify(body)).slice(0, 16);
  return { ...body, status: "confirmed", extendedProperties: { private: { [TAG]: "1", fp: fingerprint } } };
}

/** Due dates of this bill (from its first one up to `until`) that already have a matching expense. */
function paidDueDates(b: Bill, paid: Map<string, Txn>, until: string): string[] {
  return billDueDates(b, b.nextDue, until).filter((d) => paid.has(billKey(b, d)));
}

export type BillSyncResult = { added: number; updated: number; removed: number; unchanged: number; error?: string };

export async function syncBillsToCalendar(): Promise<BillSyncResult> {
  const res: BillSyncResult = { added: 0, updated: 0, removed: 0, unchanged: 0 };
  if (financeIsDemo() || calendarIsDemo()) return { ...res, error: "Connect your Finance sheet and Google Calendar first (see SETUP.md)." };
  const cal = config.google.calendarIds[0];
  const { bills, txns } = await loadFinance();
  const until = addDays(todayISO(), 60);
  const firstDue = bills.reduce((m, b) => (b.nextDue < m ? b.nextDue : m), until);
  const paid = matchBillPayments(bills, txns, firstDue, until);
  const existing = new Map((await listTaggedEvents(cal, TAG)).map((e) => [e.id, e]));
  const wanted = new Set<string>();
  const seen = new Set<string>();

  for (const b of bills) {
    if (b.endDate && b.endDate < b.nextDue) continue; // ended before it started: leave it out (its old event gets removed below)
    const id = eventId(b);
    if (seen.has(id)) continue; // two rows with the same name: the first one wins
    seen.add(id);
    const paidDays = paidDueDates(b, paid, until);
    // A one-off bill that's paid: no event at all (it gets removed below if it was there).
    if (billRule(b.frequency).unit === "once" && paidDays.length) continue;
    wanted.add(id);
    const ev = eventFor(b, paidDays);
    const old = existing.get(id);
    if (old && old.status !== "cancelled" && old.extendedProperties?.private?.fp === ev.extendedProperties.private.fp) { res.unchanged++; continue; }
    if (old) { await updateEvent(cal, id, ev); res.updated++; continue; }
    try { await insertEvent(cal, { id, ...ev }); res.added++; } catch (e) {
      // Already there (e.g. deleted long ago so not listed): overwrite it instead.
      if (!/409|already exists|duplicate/i.test(String(e))) throw e;
      await updateEvent(cal, id, ev); res.updated++;
    }
  }
  // Bills you removed from the sheet: remove their calendar events (only ones the planner made).
  for (const [id, e] of existing) {
    if (!wanted.has(id) && e.status !== "cancelled") { await deleteEvent(cal, id).catch(() => null); res.removed++; }
  }
  return res;
}
