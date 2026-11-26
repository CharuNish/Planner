import { config, financeIsDemo } from "./config";
import { addDays, daysBetween, daysInMonth, monthKey, parseDate, prevMonth, todayISO } from "./dates";
import { demoBills, demoBudgets, demoTransactions } from "./demo";
import { num, readSheet, str } from "./google";

export type Txn = { date: string; type: "Income" | "Expense"; category: string; amount: number; description: string; method: string };
export type Budget = { category: string; budget: number };
export type Bill = { name: string; amount: number; type: string; frequency: string; nextDue: string; category: string; endDate?: string };

export async function loadFinance() {
  if (financeIsDemo()) {
    return { demo: true, txns: demoTransactions() as unknown as Txn[], budgets: demoBudgets, bills: demoBills() as Bill[] };
  }
  const id = config.google.financeSheetId;
  const [t, b, bl] = await Promise.all([
    readSheet(id, "Transactions"),
    readSheet(id, "Budgets").catch(() => []),
    readSheet(id, "Bills").catch(() => []),
  ]);
  const txns: Txn[] = t.map((r) => ({
    date: parseDate(r["date"]) || "",
    type: (str(r["type"]).toLowerCase().startsWith("inc") ? "Income" : "Expense") as Txn["type"],
    category: str(r["category"]) || "Other",
    amount: Math.abs(num(r["amount"])),
    description: str(r["description"]),
    method: str(r["method"]),
  })).filter((x) => x.date && x.amount > 0);
  const budgets: Budget[] = b.map((r) => ({ category: str(r["category"]), budget: num(r["monthly budget"] ?? r["budget"]) })).filter((x) => x.category);
  const bills: Bill[] = bl.map((r) => ({
    name: str(r["name"]), amount: num(r["amount"]), type: str(r["type"]) || "Bill", frequency: str(r["frequency"]) || "Monthly",
    nextDue: parseDate(r["next due"]) || "", category: str(r["category"]),
    // Optional "End Date" column: the bill stops after this date (blank = keeps going forever).
    endDate: parseDate(r["end date"] ?? r["ends"] ?? r["end"] ?? r["until"]) || undefined,
  })).filter((x) => x.name && x.nextDue);
  return { demo: false, txns, budgets, bills };
}

/**
 * How often a bill repeats, read from the Frequency column.
 * Understands: Weekly, Fortnightly / Every 2 weeks, Monthly, Every 2 months, Quarterly,
 * Every 6 months / Half-yearly, Yearly / Annual, Once. Anything else counts as Monthly.
 */
export type BillRule = { unit: "day" | "month" | "once"; every: number };
export function billRule(frequency: string): BillRule {
  const f = frequency.toLowerCase().trim();
  const n = Number(f.match(/(\d+)/)?.[1] || 0);
  if (!f) return { unit: "month", every: 1 };
  if (/once|one.?time|one.?off/.test(f)) return { unit: "once", every: 0 };
  if (/daily|every ?day/.test(f)) return { unit: "day", every: 1 };
  if (/fortnight|bi.?week/.test(f)) return { unit: "day", every: 14 };
  if (/week/.test(f)) return { unit: "day", every: 7 * (n || 1) };
  if (/day/.test(f) && n) return { unit: "day", every: n };
  if (/quarter/.test(f)) return { unit: "month", every: 3 };
  if (/half|semi/.test(f)) return { unit: "month", every: 6 };
  if (/bi.?month/.test(f)) return { unit: "month", every: 2 };
  if (/year|annual/.test(f)) return { unit: "month", every: 12 * (n || 1) };
  if (/month/.test(f)) return { unit: "month", every: n || 1 };
  return { unit: "month", every: 1 };
}

/** Adds whole months, keeping the same day of the month (31st becomes the last day in shorter months). */
function addMonthsKeepDay(iso: string, months: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12), nm = total % 12;
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return `${ny}-${String(nm + 1).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

/** The k-th due date of a bill (k = 0 is the Next Due date in your sheet). */
function occurrence(start: string, rule: BillRule, k: number) {
  if (rule.unit === "day") return addDays(start, k * rule.every);
  if (rule.unit === "month") return addMonthsKeepDay(start, k * rule.every);
  return start;
}

/** Every due date of a bill between two dates (inclusive), rolling forward from Next Due by its Frequency. */
export function billDueDates(bill: Bill, from: string, to: string) {
  const rule = billRule(bill.frequency);
  if (bill.endDate && bill.endDate < to) to = bill.endDate;
  if (to < from) return [];
  if (rule.unit === "once") return bill.nextDue >= from && bill.nextDue <= to ? [bill.nextDue] : [];
  let k = 0;
  if (bill.nextDue < from) {
    // Jump close to "from" instead of stepping one by one through old dates.
    const gap = rule.unit === "day" ? daysBetween(bill.nextDue, from) / rule.every : daysBetween(bill.nextDue, from) / 31 / rule.every;
    k = Math.max(0, Math.floor(gap) - 1);
  }
  const out: string[] = [];
  for (let guard = 0; guard < 1000; guard++, k++) {
    const d = occurrence(bill.nextDue, rule, k);
    if (d > to) break;
    if (d >= from) out.push(d);
  }
  return out;
}

/** The next time a bill is due, today or later (rolls forward automatically, no sheet edits needed). */
export function nextDueDate(bill: Bill, today = todayISO()): string | null {
  return billDueDates(bill, today, addDays(today, 3700))[0] || null;
}

/** Every bill payment due in the next `days` days. A weekly bill shows once per week, a monthly one once per month, and so on.
 *  Pass your transactions too and each one says whether it's already paid (see matchBillPayments). */
export function upcomingBills(bills: Bill[], days = 30, txns: Txn[] = []) {
  const today = todayISO();
  const end = addDays(today, days);
  const paid = matchBillPayments(bills, txns, today, end);
  return bills
    .flatMap((b) => billDueDates(b, today, end).map((due) => {
      const key = billKey(b, due);
      return { ...b, due, key, paid: paid.has(key), paidOn: paid.get(key)?.date };
    }))
    .sort((a, b) => a.due.localeCompare(b.due) || a.name.localeCompare(b.name));
}

export const billKey = (b: Bill, due: string) => `${b.name}|${due}`;

// Words that say nothing about WHICH bill it is, so they're ignored when matching names.
const FILLER = new Set(["bill", "bills", "payment", "payments", "pay", "paid", "monthly", "fee", "fees", "the", "for", "of", "and"]);
const words = (s: string) => s.toLowerCase().split(/[^a-z0-9\u0d80-\u0dff]+/).filter((w) => w.length >= 2 && !FILLER.has(w));
const sameWord = (a: string, b: string) => a === b || (Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a)));

/**
 * Works out which bill due dates are already paid, by looking at the expenses in your Transactions tab.
 *
 * An expense pays a bill's due date when BOTH are true:
 *  1. Its date is close to that due date: from about half a period before it (15 days for a monthly bill,
 *     3 days for a weekly one) until just before the next due date's window starts. So paying a bit early or late still counts.
 *  2. It looks like that bill, one of:
 *     - its Description (or Category) has all the words of the bill's name, e.g. "Electricity CEB Home" for "Electricity (CEB) - Home"
 *     - it's the exact same amount AND shares at least one word with the bill's name, e.g. "CEB" for LKR 5,000
 *     - it's the exact same amount AND the same Category as the bill
 * Each expense can pay only one bill, and the best match wins. Words like "bill" or "payment" are ignored.
 * Returns a map of billKey -> the expense that paid it, for due dates between `from` and `to`.
 */
export function matchBillPayments(bills: Bill[], txns: Txn[], from: string, to: string): Map<string, Txn> {
  const expenses = txns.filter((t) => t.type === "Expense");
  const out = new Map<string, Txn>();
  if (!expenses.length) return out;
  const pairs: { key: string; txn: number; level: number; gap: number }[] = [];
  for (const b of bills) {
    const rule = billRule(b.frequency);
    const half = rule.unit === "day" ? Math.max(1, Math.floor(rule.every / 2)) : rule.unit === "month" ? rule.every * 15 : 30;
    const nameWords = words(b.name);
    for (const due of billDueDates(b, from, to)) {
      const next = rule.unit === "once" ? addDays(due, 90) : billDueDates(b, addDays(due, 1), addDays(due, 400 * Math.max(1, rule.every)))[0] || addDays(due, half * 4);
      const start = addDays(due, -half), end = addDays(next, -half - 1);
      expenses.forEach((t, i) => {
        if (t.date < start || t.date > end) return;
        const text = words(`${t.description} ${t.category}`);
        const hits = nameWords.filter((w) => text.some((x) => sameWord(w, x))).length;
        const sameAmount = Math.abs(t.amount - b.amount) < 0.5;
        const level =
          nameWords.length && hits === nameWords.length ? 3
          : sameAmount && hits > 0 ? 2
          : sameAmount && b.category && b.category.toLowerCase() === t.category.toLowerCase() ? 1 : 0;
        if (level) pairs.push({ key: billKey(b, due), txn: i, level, gap: Math.abs(daysBetween(t.date, due)) });
      });
    }
  }
  pairs.sort((a, b) => b.level - a.level || a.gap - b.gap);
  const used = new Set<number>();
  for (const p of pairs) {
    if (out.has(p.key) || used.has(p.txn)) continue;
    out.set(p.key, expenses[p.txn]);
    used.add(p.txn);
  }
  return out;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function analyseFinance(txns: Txn[], budgets: Budget[]) {
  const today = todayISO();
  const month = monthKey(today);
  const dom = Number(today.slice(8, 10));
  const dim = daysInMonth(month);
  const last3 = [prevMonth(month, 1), prevMonth(month, 2), prevMonth(month, 3)];

  const inMonth = (m: string) => txns.filter((t) => monthKey(t.date) === m);
  const thisM = inMonth(month);
  const income = sum(thisM.filter((t) => t.type === "Income").map((t) => t.amount));
  const expense = sum(thisM.filter((t) => t.type === "Expense").map((t) => t.amount));
  const totalBudget = sum(budgets.map((b) => b.budget));

  // Per-category view
  const categories = new Set<string>([...budgets.map((b) => b.category), ...thisM.filter((t) => t.type === "Expense").map((t) => t.category)]);
  const byCat = [...categories].map((category) => {
    const spent = sum(thisM.filter((t) => t.type === "Expense" && t.category === category).map((t) => t.amount));
    const budget = budgets.find((b) => b.category.toLowerCase() === category.toLowerCase())?.budget || 0;
    const avg3 = sum(last3.map((m) => sum(inMonth(m).filter((t) => t.type === "Expense" && t.category === category).map((t) => t.amount)))) / 3;
    // Fixed costs (rent, bills) usually come once a month, so don't extrapolate them from the day of the month.
    const perMonthCount = last3.map((m) => inMonth(m).filter((t) => t.type === "Expense" && t.category === category).length);
    const isFixed = perMonthCount.every((c) => c <= 1) && perMonthCount.some((c) => c === 1);
    const projectedCat = isFixed ? Math.max(spent, avg3) : (spent / Math.max(dom, 1)) * dim;
    return { category, spent, budget, avg3, left: budget - spent, pct: budget ? spent / budget : 0, projected: projectedCat };
  }).sort((a, b) => b.spent - a.spent);

  const uncategorised = expense - sum(byCat.map((c) => c.spent));
  const projected = sum(byCat.map((c) => c.projected)) + (uncategorised / Math.max(dom, 1)) * dim;

  // Where to focus on saving: over budget, heading over budget, or much higher than usual.
  const focus = byCat
    .map((c) => {
      let score = 0; const reasons: string[] = [];
      if (c.budget && c.spent > c.budget) { score += (c.spent - c.budget) * 2; reasons.push(`already ${fmt(c.spent - c.budget)} over budget`); }
      else if (c.budget && c.projected > c.budget * 1.05 && c.category.toLowerCase() !== "rent") { score += c.projected - c.budget; reasons.push(`on pace to end the month around ${fmt(c.projected)} (budget ${fmt(c.budget)})`); }
      if (c.avg3 > 0 && c.projected > c.avg3 * 1.3 && c.projected - c.avg3 > 1500) { score += c.projected - c.avg3; reasons.push(`${Math.round((c.projected / c.avg3 - 1) * 100)}% more than your usual month`); }
      return { ...c, score, reasons };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // Anomalies: unusually large purchases, category spikes, possible duplicates.
  const anomalies: { date?: string; title: string; detail: string }[] = [];
  const recent = txns.filter((t) => t.type === "Expense" && daysBetween(t.date, today) <= 30 && t.date <= today);
  for (const t of recent) {
    const hist = txns.filter((h) => h.type === "Expense" && h.category === t.category && h.date < addDays(today, -30)).map((h) => h.amount);
    if (hist.length >= 5) {
      const med = median(hist);
      const mean = sum(hist) / hist.length;
      const sd = Math.sqrt(sum(hist.map((x) => (x - mean) ** 2)) / hist.length);
      if (t.amount > med * 3 && t.amount > mean + 2.5 * sd) {
        anomalies.push({ date: t.date, title: `Big ${t.category} spend: ${fmt(t.amount)}`, detail: `${t.description || "No description"}. Your usual ${t.category} spend is about ${fmt(med)}.` });
      }
    }
  }
  const seen = new Map<string, number>();
  for (const t of thisM.filter((t) => t.type === "Expense")) {
    const k = `${t.date}|${t.category}|${t.amount}`;
    seen.set(k, (seen.get(k) || 0) + 1);
    if (seen.get(k) === 2) anomalies.push({ date: t.date, title: `Possible duplicate: ${fmt(t.amount)} ${t.category}`, detail: "Two identical entries on the same day. Delete one if it was a mistake." });
  }
  for (const c of byCat) {
    if (c.avg3 > 0 && dom >= 7 && c.projected > c.avg3 * 1.8 && c.projected - c.avg3 > 3000) {
      anomalies.push({ title: `${c.category} is spiking`, detail: `Heading for ${fmt(c.projected)} this month vs ${fmt(c.avg3)} on average.` });
    }
  }

  // Chart data
  const lastMonth = prevMonth(month);
  const cumulative: { day: number; thisMonth: number | null; lastMonth: number; budget: number }[] = [];
  let a = 0, b = 0;
  for (let d = 1; d <= dim; d++) {
    const dd = String(d).padStart(2, "0");
    a += sum(thisM.filter((t) => t.type === "Expense" && t.date.slice(8, 10) === dd).map((t) => t.amount));
    b += sum(inMonth(lastMonth).filter((t) => t.type === "Expense" && t.date.slice(8, 10) === dd).map((t) => t.amount));
    cumulative.push({ day: d, thisMonth: d <= dom ? a : null, lastMonth: b, budget: Math.round((totalBudget / dim) * d) });
  }
  const trend = [5, 4, 3, 2, 1, 0].map((n) => {
    const m = prevMonth(month, n);
    const mt = inMonth(m);
    const inc = sum(mt.filter((t) => t.type === "Income").map((t) => t.amount));
    const exp = sum(mt.filter((t) => t.type === "Expense").map((t) => t.amount));
    return { month: new Date(m + "-01T00:00:00Z").toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }), income: inc, expense: exp, saved: inc - exp };
  });

  const lastMonthSameDay = sum(inMonth(lastMonth).filter((t) => t.type === "Expense" && Number(t.date.slice(8, 10)) <= dom).map((t) => t.amount));
  const spentToday = sum(thisM.filter((t) => t.type === "Expense" && t.date === today).map((t) => t.amount));
  const budgetLeft = totalBudget - expense;
  const daysLeft = dim - dom + 1;

  return {
    month, dom, dim, income, expense, net: income - expense, totalBudget, budgetLeft, projected,
    perDayAllowance: daysLeft > 0 ? Math.max(budgetLeft, 0) / daysLeft : 0,
    savingsRate: income ? (income - expense) / income : 0,
    vsLastMonth: lastMonthSameDay ? expense / lastMonthSameDay - 1 : 0,
    spentToday, byCat, focus, anomalies: anomalies.slice(0, 8), cumulative, trend,
    recent: [...txns].filter((t) => t.date <= today).sort((x, y) => y.date.localeCompare(x.date)).slice(0, 12),
  };
}

export function fmt(n: number) {
  return `${config.currency} ${Math.round(n).toLocaleString("en-US")}`;
}
