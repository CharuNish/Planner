import { config, financeIsDemo } from "./config";
import { addDays, daysBetween, daysInMonth, monthKey, parseDate, prevMonth, todayISO } from "./dates";
import { demoBills, demoBudgets, demoTransactions } from "./demo";
import { num, readSheet, str } from "./google";

export type Txn = { date: string; type: "Income" | "Expense"; category: string; amount: number; description: string; method: string };
export type Budget = { category: string; budget: number };
export type Bill = { name: string; amount: number; type: string; frequency: string; nextDue: string; category: string };

export async function loadFinance() {
  if (financeIsDemo()) {
    return { demo: true, txns: demoTransactions() as unknown as Txn[], budgets: demoBudgets, bills: demoBills() };
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
  })).filter((x) => x.name && x.nextDue);
  return { demo: false, txns, budgets, bills };
}

/** Rolls a bill's due date forward until it is today or later. */
export function nextDueDate(bill: Bill, today = todayISO()) {
  let d = bill.nextDue;
  const f = bill.frequency.toLowerCase();
  const step = (iso: string) => {
    const dt = new Date(iso + "T00:00:00Z");
    if (f.startsWith("week")) dt.setUTCDate(dt.getUTCDate() + 7);
    else if (f.startsWith("quart")) dt.setUTCMonth(dt.getUTCMonth() + 3);
    else if (f.startsWith("year") || f.startsWith("annual")) dt.setUTCFullYear(dt.getUTCFullYear() + 1);
    else if (f.startsWith("once")) return null;
    else dt.setUTCMonth(dt.getUTCMonth() + 1);
    return dt.toISOString().slice(0, 10);
  };
  let guard = 0;
  while (d < today && guard++ < 500) {
    const n = step(d);
    if (!n) return d;
    d = n;
  }
  return d;
}

export function upcomingBills(bills: Bill[], days = 30) {
  const today = todayISO();
  return bills
    .map((b) => ({ ...b, due: nextDueDate(b, today) }))
    .filter((b) => b.due >= today && daysBetween(today, b.due) <= days)
    .sort((a, b) => a.due.localeCompare(b.due));
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
