// Savings & investments: fixed deposits (FDs), planned FDs, T-bills/bonds, unit trusts, stocks, gold, savings…
// Everything lives in ONE "Investments" tab of the Finance sheet (created for you the first time the Finance page opens).
// For FDs, bills and bonds the planner works out the interest itself from the rate and dates.
// For things whose price moves (stocks, unit trusts, gold) type today's value into "Current Value" whenever you check it.
import { config, financeIsDemo } from "./config";
import { addDays, daysBetween, parseDate, todayISO } from "./dates";
import { ensureTab, num, readSheet, str } from "./google";

export const INV_TAB = "Investments";
export const INV_HEADERS = ["Name", "Type", "Institution", "Amount", "Rate %", "Start Date", "Term (Months)", "Maturity Date", "Interest Payout", "Auto Renew", "Current Value", "Status", "Notes"];
export const INV_TYPES = ["Fixed Deposit", "Treasury Bill", "Treasury Bond", "Unit Trust", "Stocks (CSE)", "Gold", "Savings Account", "Other"];
export const INV_STATUS = ["Active", "Planned", "Matured", "Withdrawn"];
export const INV_PAYOUT = ["At Maturity", "Monthly", "Yearly"];
export const INV_DROPDOWNS: Record<string, string[]> = { Type: INV_TYPES, Status: INV_STATUS, "Interest Payout": INV_PAYOUT, "Auto Renew": ["Yes", "No"] };

export type Investment = {
  name: string; type: string; institution: string; amount: number; rate: number;
  start: string; termMonths: number; maturity: string; payout: string; autoRenew: boolean;
  currentValue: number; status: "Active" | "Planned" | "Matured" | "Withdrawn"; notes: string;
};

const addMonths = (iso: string, m: number) => {
  const d = new Date(iso + "T00:00:00Z");
  const day = d.getUTCDate();
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + m);
  const dim = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, dim));
  return d.toISOString().slice(0, 10);
};
const pickFrom = (list: string[], v: string, fallback: string) => list.find((x) => x.toLowerCase() === v.toLowerCase()) || list.find((x) => v && x.toLowerCase().startsWith(v.toLowerCase().slice(0, 4))) || fallback;
/** Things that earn a fixed rate, so we can work out the interest. */
export const isInterestType = (t: string) => /deposit|bill|bond|savings|fd/i.test(t);

export function toInvestment(r: Record<string, unknown>): Investment | null {
  const name = str(r["name"]);
  const amount = num(r["amount"]);
  if (!name && !amount) return null;
  const start = parseDate(r["start date"]) || "";
  const termMonths = num(r["term (months)"] ?? r["term"]);
  let maturity = parseDate(r["maturity date"]) || "";
  if (!maturity && start && termMonths) maturity = addMonths(start, termMonths);
  const rawStatus = str(r["status"]);
  let status = pickFrom(INV_STATUS, rawStatus, "") as Investment["status"];
  if (!status) status = start && start > todayISO() ? "Planned" : "Active";
  return {
    name: name || str(r["type"]) || "Investment",
    type: pickFrom(INV_TYPES, str(r["type"]), "Other"),
    institution: str(r["institution"] ?? r["bank"]),
    amount, rate: num(r["rate %"] ?? r["rate"]), start, termMonths, maturity,
    payout: pickFrom(INV_PAYOUT, str(r["interest payout"]), "At Maturity"),
    autoRenew: /^(y|yes|true|✓)/i.test(str(r["auto renew"])),
    currentValue: num(r["current value"]), status, notes: str(r["notes"]),
  };
}

export async function loadInvestments(): Promise<{ demo: boolean; items: Investment[] }> {
  if (financeIsDemo()) return { demo: true, items: demoInvestments() };
  const id = config.google.financeSheetId;
  let rows: Record<string, unknown>[] = [];
  try { rows = await readSheet(id, INV_TAB); } catch (e) {
    if (!/misnamed|parse range/i.test(String(e))) throw e;
    await ensureTab(id, INV_TAB, INV_HEADERS, INV_DROPDOWNS); // first visit: make the tab for you
  }
  return { demo: false, items: rows.map(toInvestment).filter((x): x is Investment => !!x) };
}

// ───── Maths ─────
const simple = (p: number, ratePct: number, days: number) => (p * (ratePct / 100) * Math.max(days, 0)) / 365;

export type Holding = Investment & {
  /** Where the money sits now (for an auto-renewed FD, the current round). */
  periodStart: string; periodEnd: string; principal: number; renewals: number;
  value: number; earned: number; expectedInterest: number; maturityValue: number;
  daysLeft: number | null; progress: number; monthlyPayout: number;
};

/** Works out today's value, interest so far and interest at maturity. Auto-renewing FDs roll over into a new term. */
export function valueHolding(inv: Investment, today = todayISO()): Holding {
  let principal = inv.amount, periodStart = inv.start, periodEnd = inv.maturity, renewals = 0, earnedBefore = 0;
  const reinvest = inv.payout === "At Maturity";
  const termDays = inv.start && inv.maturity ? daysBetween(inv.start, inv.maturity) : 0;
  // Auto-renew: every finished term starts again on the maturity date (interest added back in if paid at maturity).
  while (inv.autoRenew && inv.status === "Active" && periodEnd && periodEnd <= today && termDays > 0 && renewals < 60) {
    const i = simple(principal, inv.rate, daysBetween(periodStart, periodEnd));
    if (reinvest) principal += i; else earnedBefore += i;
    periodStart = periodEnd;
    periodEnd = inv.termMonths ? addMonths(periodStart, inv.termMonths) : addDays(periodStart, termDays);
    renewals++;
  }
  if (reinvest) earnedBefore += principal - inv.amount;

  const interest = isInterestType(inv.type) && inv.rate > 0;
  const fullDays = periodStart && periodEnd ? daysBetween(periodStart, periodEnd) : 0;
  const elapsed = periodStart ? Math.min(Math.max(daysBetween(periodStart, today), 0), fullDays || Infinity) : 0;
  const accrued = interest ? simple(principal, inv.rate, periodEnd ? elapsed : periodStart ? daysBetween(periodStart, today) : 0) : 0;
  const expectedInterest = interest && periodEnd ? simple(principal, inv.rate, fullDays) : 0;
  const monthlyPayout = interest && inv.payout === "Monthly" ? (principal * inv.rate) / 100 / 12 : 0;

  let value: number;
  if (inv.currentValue > 0) value = inv.currentValue;
  else if (inv.status === "Planned") value = 0;
  else if (interest && reinvest) value = principal + accrued;
  else value = principal;
  if (inv.status === "Matured" || inv.status === "Withdrawn") value = inv.currentValue > 0 ? inv.currentValue : 0;

  const earned = inv.currentValue > 0 && !interest ? inv.currentValue - inv.amount : earnedBefore + accrued;
  const daysLeft = periodEnd ? daysBetween(today, periodEnd) : null;
  return {
    ...inv, periodStart, periodEnd, principal, renewals, value, earned, expectedInterest,
    maturityValue: reinvest ? principal + expectedInterest : principal,
    daysLeft, progress: fullDays > 0 ? elapsed / fullDays : 0, monthlyPayout,
  };
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function analyseInvestments(items: Investment[], today = todayISO()) {
  const all = items.map((i) => valueHolding(i, today));
  const active = all.filter((h) => h.status === "Active");
  const planned = all.filter((h) => h.status === "Planned").sort((a, b) => (a.start || "9").localeCompare(b.start || "9"));
  const closed = all.filter((h) => h.status === "Matured" || h.status === "Withdrawn");

  const byType = new Map<string, number>();
  for (const h of active) byType.set(h.type, (byType.get(h.type) || 0) + h.value);
  const allocation = [...byType.entries()].map(([type, value]) => ({ type, value })).sort((a, b) => b.value - a.value);

  const fds = active.filter((h) => isInterestType(h.type) && h.periodEnd);
  const upcoming = fds.filter((h) => h.daysLeft !== null && h.daysLeft >= 0).sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
  // Matured but still marked Active and not auto-renewing: remind her to collect / reinvest.
  const overdue = fds.filter((h) => h.daysLeft !== null && h.daysLeft < 0 && !h.autoRenew);
  const ratesFd = fds.filter((h) => h.rate > 0);
  const avgRate = ratesFd.length ? sum(ratesFd.map((h) => h.rate * h.principal)) / Math.max(sum(ratesFd.map((h) => h.principal)), 1) : 0;
  const yearlyInterest = sum(fds.map((h) => (h.principal * h.rate) / 100));
  const monthlyIncome = sum(active.map((h) => h.monthlyPayout));

  return {
    all, active, planned, closed, allocation, upcoming, overdue,
    invested: sum(active.map((h) => h.amount)),
    value: sum(active.map((h) => h.value)),
    earned: sum(active.map((h) => h.earned)) + sum(closed.map((h) => Math.max(h.currentValue - h.amount, 0))),
    expectedInterest: sum(fds.map((h) => h.expectedInterest)),
    maturingTotal: sum(upcoming.filter((h) => (h.daysLeft ?? 99) <= 90).map((h) => h.maturityValue)),
    plannedTotal: sum(planned.map((h) => h.amount)),
    avgRate, yearlyInterest, monthlyIncome,
  };
}

/** Lines for the 7 AM Telegram to-do list: maturities in the next 7 days, planned FDs starting in 3 days, and matured ones still waiting. */
export function investmentTodos(items: Investment[], today = todayISO()) {
  const a = analyseInvestments(items, today);
  const money = (n: number) => `${config.currency} ${Math.round(n).toLocaleString("en-US")}`;
  const when = (d: number) => (d === 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`);
  const out: { icon: string; text: string }[] = [];
  for (const h of a.upcoming.filter((h) => (h.daysLeft ?? 99) <= 7)) {
    out.push({ icon: "🏦", text: `${h.name}${h.institution ? ` (${h.institution})` : ""} matures ${when(h.daysLeft!)}: ${money(h.maturityValue)}${h.autoRenew ? ", auto-renews" : ". Decide: renew or move it?"}` });
  }
  for (const h of a.overdue.slice(0, 2)) out.push({ icon: "🏦", text: `${h.name} matured ${-h.daysLeft!} days ago. Renew it or mark it Matured in the sheet` });
  for (const h of a.planned.filter((h) => h.start && daysBetween(today, h.start) >= 0 && daysBetween(today, h.start) <= 3)) {
    out.push({ icon: "🌱", text: `Planned: open ${h.name} ${money(h.amount)}${h.rate ? ` at ${h.rate}%` : ""} ${when(daysBetween(today, h.start))}` });
  }
  return out;
}

export function demoInvestments(): Investment[] {
  const t = todayISO();
  const base = { notes: "", currentValue: 0, autoRenew: false, payout: "At Maturity", status: "Active" as const, termMonths: 0, maturity: "", rate: 0, institution: "" };
  const fd = (name: string, institution: string, amount: number, rate: number, startAgo: number, term: number, extra: Partial<Investment> = {}): Investment => {
    const start = addDays(t, -startAgo);
    return { ...base, name, type: "Fixed Deposit", institution, amount, rate, start, termMonths: term, maturity: addMonths(start, term), ...extra };
  };
  return [
    fd("FD 12 months", "Commercial Bank", 500000, 10.5, 340, 12),
    fd("FD 6 months", "Sampath Bank", 250000, 9.25, 120, 6, { autoRenew: true }),
    fd("FD monthly interest", "HNB", 300000, 9.0, 200, 24, { payout: "Monthly" }),
    { ...base, name: "T-bill 91 days", type: "Treasury Bill", institution: "CBSL via HNB", amount: 200000, rate: 8.4, start: addDays(t, -60), maturity: addDays(t, 31) },
    { ...base, name: "Money market fund", type: "Unit Trust", institution: "CAL", amount: 150000, start: addDays(t, -150), currentValue: 161200 },
    { ...base, name: "JKH + COMB shares", type: "Stocks (CSE)", institution: "CSE", amount: 100000, start: addDays(t, -400), currentValue: 118500 },
    { ...base, name: "Gold coins (8g)", type: "Gold", amount: 180000, start: addDays(t, -300), currentValue: 214000 },
    { ...base, name: "Emergency savings", type: "Savings Account", institution: "BOC", amount: 120000, rate: 3, start: addDays(t, -500) },
    fd("Next FD (bonus money)", "NSB", 400000, 9.5, -12, 12, { status: "Planned" }),
    fd("FD after T-bill matures", "Commercial Bank", 200000, 10, -32, 6, { status: "Planned" }),
  ];
}
