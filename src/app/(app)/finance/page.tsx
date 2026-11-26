import { IncomeExpenseChart, SpendPaceChart } from "@/components/charts";
import { AddTransactionForm, SyncBillsButton } from "@/components/forms";
import { after } from "next/server";
import { syncBillsToCalendar } from "@/lib/billsync";
import { DemoBanner, Empty, PageHeader, ProgressBar, Section, Stat } from "@/components/ui";
import { calendarIsDemo, config } from "@/lib/config";
import { daysBetween, prettyDate, relativeDays, todayISO } from "@/lib/dates";
import { analyseFinance, fmt, loadFinance, upcomingBills } from "@/lib/finance";
import { InvestmentsSection } from "@/components/investments";
import { loadInvestments } from "@/lib/investments";
import { Celebration } from "@/components/celebrate";
import { savingsWin } from "@/lib/celebrations";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  let data;
  const inv = loadInvestments().then((r) => ({ items: r.items, error: "" }), (e) => ({ items: [], error: String(e).slice(0, 300) }));
  try { data = await loadFinance(); } catch (e) {
    return <div><PageHeader title="💰 Finance" /><div className="card p-5 text-bad text-sm">Couldn&apos;t read your finance sheet: {String(e).slice(0, 300)}</div></div>;
  }
  const a = analyseFinance(data.txns, data.budgets);
  const bills = upcomingBills(data.bills, 30, data.txns);
  const unpaid = bills.filter((b) => !b.paid);
  // After the page is sent, quietly make sure every bill is in your Google Calendar (cheap when nothing changed).
  if (!data.demo && !calendarIsDemo()) after(() => syncBillsToCalendar().catch(() => null));
  const today = todayISO();
  const monthName = prettyDate(a.month + "-01", { month: "long", year: "numeric" });
  const cats = [...new Set(data.txns.map((t) => t.category))];
  const pctTime = a.dom / a.dim;
  const investments = await inv;

  return (
    <div className="space-y-5">
      <PageHeader title="💰 Finance" subtitle={`${monthName} · day ${a.dom} of ${a.dim}`}>
        <AddTransactionForm categories={cats} />
      </PageHeader>
      {data.demo && <DemoBanner what="finance sheet" />}
      <Celebration kind="coins" title="You saved more than last month! 💸" items={savingsWin(a.trend, a.month, fmt)} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Income" value={fmt(a.income)} />
        <Stat label="Spent" value={fmt(a.expense)} hint={a.vsLastMonth ? `${a.vsLastMonth > 0 ? "▲" : "▼"} ${Math.abs(Math.round(a.vsLastMonth * 100))}% vs this point last month` : undefined} tone={a.vsLastMonth > 0.1 ? "warn" : undefined} />
        <Stat label="Budget left" value={fmt(a.budgetLeft)} tone={a.budgetLeft < 0 ? "bad" : "good"} hint={`≈ ${fmt(a.perDayAllowance)} per day left`} />
        <Stat label="Saved so far" value={fmt(a.net)} tone={a.net < 0 ? "bad" : "good"} hint={a.income ? `${Math.round(a.savingsRate * 100)}% of income` : undefined} />
      </div>

      <div className="card p-5 text-sm">
        {a.projected > a.totalBudget
          ? <p>📈 At this pace you&apos;ll spend about <b>{fmt(a.projected)}</b> this month, which is <b className="text-bad">{fmt(a.projected - a.totalBudget)} over</b> your total budget of {fmt(a.totalBudget)}.</p>
          : <p>🌿 At this pace you&apos;ll spend about <b>{fmt(a.projected)}</b> this month, leaving <b className="text-good">{fmt(a.totalBudget - a.projected)}</b> of your {fmt(a.totalBudget)} budget. Keep it up!</p>}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Section title="Spending through the month"><SpendPaceChart data={a.cumulative} currency={config.currency} /></Section>
        <Section title="Income vs expenses (6 months)"><IncomeExpenseChart data={a.trend} currency={config.currency} /></Section>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Section title="Budget by category" className="lg:col-span-2">
          <div className="space-y-3">
            {a.byCat.map((c) => {
              const ratio = c.budget ? c.spent / c.budget : 0;
              const tone = !c.budget ? "accent" : ratio > 1 ? "bad" : ratio > pctTime + 0.15 ? "warn" : "good";
              return (
                <div key={c.category}>
                  <div className="flex justify-between text-sm mb-1 gap-2">
                    <span className="font-medium">{c.category}</span>
                    <span className="tabular muted">{fmt(c.spent)}{c.budget ? ` / ${fmt(c.budget)}` : " · no budget"}</span>
                  </div>
                  <ProgressBar value={c.budget ? ratio : 1} tone={tone} />
                  {c.budget > 0 && <div className="text-xs muted mt-0.5">{c.left >= 0 ? `${fmt(c.left)} left` : `${fmt(-c.left)} over`}{c.avg3 ? ` · usually ${fmt(c.avg3)}/month` : ""}</div>}
                </div>
              );
            })}
          </div>
          <p className="text-xs muted mt-4">Green: on track · Amber: spending faster than the month is passing · Red: over budget</p>
        </Section>

        <div className="space-y-5">
          <Section title="💡 Where to save">
            {a.focus.length ? (
              <ul className="space-y-3 text-sm">{a.focus.map((c) => <li key={c.category}><b>{c.category}</b>: {c.reasons.join(", and ")}.</li>)}</ul>
            ) : <Empty>Everything is within budget and close to normal. 🎉</Empty>}
          </Section>
          <Section title="⚠️ Unusual activity" className="scroll-mt-4" >
            <div id="anomalies" />
            {a.anomalies.length ? (
              <ul className="space-y-3 text-sm">{a.anomalies.map((x, i) => (
                <li key={i}><div className="font-medium">{x.title}</div><div className="text-xs muted">{x.date ? prettyDate(x.date) + " · " : ""}{x.detail}</div></li>
              ))}</ul>
            ) : <Empty>Nothing unusual in the last 30 days.</Empty>}
          </Section>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Section title="Bills & subscriptions (next 30 days)" action={!data.demo && !calendarIsDemo() ? <SyncBillsButton /> : undefined}>
          {bills.length ? (
            <ul className="space-y-2">
              {bills.map((b) => (
                <li key={b.key} className={`flex justify-between text-sm gap-2${b.paid ? " opacity-60" : ""}`} title={b.paid ? `Paid ${b.paidOn ? prettyDate(b.paidOn) : ""} (found in your expenses)` : undefined}>
                  <span><span className={b.paid ? "line-through" : ""}>{b.name}</span> <span className="chip soft ml-1">{b.paid ? "✓ Paid" : b.type}</span></span>
                  <span className="text-right"><span className={`tabular font-medium${b.paid ? " line-through" : ""}`}>{fmt(b.amount)}</span><span className="block text-xs muted">{prettyDate(b.due)} · {b.paid ? `paid${b.paidOn ? " " + prettyDate(b.paidOn) : ""}` : relativeDays(daysBetween(today, b.due))}</span></span>
                </li>
              ))}
              <li className="flex justify-between text-sm pt-2 border-t font-semibold" style={{ borderColor: "var(--border)" }}><span>{unpaid.length < bills.length ? "Still to pay" : "Total"}</span><span className="tabular">{fmt(unpaid.reduce((x, b) => x + b.amount, 0))}</span></li>
              {unpaid.length < bills.length && <li className="flex justify-between text-xs muted"><span>Already paid</span><span className="tabular">{fmt(bills.reduce((x, b) => x + (b.paid ? b.amount : 0), 0))}</span></li>}
            </ul>
          ) : <Empty>No bills in the next 30 days. Add them to the Bills tab of your sheet.</Empty>}
        </Section>
        <Section title="Recent transactions">
          <ul className="space-y-2">
            {a.recent.map((t, i) => (
              <li key={i} className="flex justify-between text-sm gap-2">
                <span className="min-w-0 truncate">{t.description || t.category} <span className="muted text-xs">· {t.category} · {prettyDate(t.date, { day: "numeric", month: "short" })}</span></span>
                <span className={`tabular shrink-0 ${t.type === "Income" ? "text-good" : ""}`}>{t.type === "Income" ? "+" : "−"}{fmt(t.amount)}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
      {investments.error
        ? <div className="card p-5 text-bad text-sm">Couldn&apos;t read the Investments tab: {investments.error}</div>
        : <InvestmentsSection items={investments.items} />}
    </div>
  );
}
