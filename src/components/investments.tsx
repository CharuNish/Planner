import { config } from "@/lib/config";
import { daysBetween, prettyDate, relativeDays, todayISO } from "@/lib/dates";
import { fmt } from "@/lib/finance";
import { analyseInvestments, isInterestType, type Investment } from "@/lib/investments";
import { ALLOC_COLORS, AllocationChart } from "./investment-chart";
import { AddInvestmentForm } from "./investment-form";
import { Empty, ProgressBar, Section, Stat } from "./ui";

const pct = (n: number) => `${Math.round(n * 10) / 10}%`;
const countdown = (d: number) => (d === 0 ? "today 🎉" : d === 1 ? "tomorrow" : d < 0 ? `${-d} days ago` : d < 60 ? `in ${d} days` : `in ${Math.round(d / 30.4)} months`);

export function InvestmentsSection({ items }: { items: Investment[] }) {
  const a = analyseInvestments(items);
  const today = todayISO();
  const gain = a.value - a.invested;
  const next = a.upcoming[0];

  return (
    <div id="investments" className="space-y-5 scroll-mt-4 pt-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="kicker mb-1">{"// investments"}</div>
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight">🏦 Savings & investments</h2>
          <p className="muted text-sm mt-1">FDs, T-bills, unit trusts, shares, gold and savings, from the Investments tab of your finance sheet.</p>
        </div>
        <AddInvestmentForm />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Worth today" value={fmt(a.value)} hint={`${fmt(a.invested)} put in${gain ? ` · ${gain > 0 ? "+" : "−"}${fmt(Math.abs(gain))}` : ""}`} tone={gain < 0 ? "bad" : "good"} />
        <Stat label="Earned so far" value={fmt(a.earned)} hint={a.monthlyIncome ? `+ ${fmt(a.monthlyIncome)} a month from monthly-interest FDs` : "interest + gains to date"} tone="good" />
        <Stat label="FD interest this term" value={fmt(a.expectedInterest)} hint={a.avgRate ? `avg rate ${pct(a.avgRate)} · ≈ ${fmt(a.yearlyInterest)} a year` : "add FDs with a rate"} />
        <Stat label="Next maturity" value={next ? countdown(next.daysLeft!) : "—"} hint={next ? `${next.name}: ${fmt(next.maturityValue)} on ${prettyDate(next.periodEnd, { day: "numeric", month: "short" })}` : "no FDs maturing yet"} tone={next && next.daysLeft! <= 7 ? "warn" : undefined} />
      </div>

      {a.overdue.length > 0 && (
        <div className="card p-4 text-sm">⏰ <b>{a.overdue.map((h) => h.name).join(", ")}</b> already matured. Renew {a.overdue.length > 1 ? "them" : "it"} (new row with the new dates) or set Status to <b>Matured</b> in the sheet so the money isn&apos;t sitting idle.</div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        <Section title="Where your money is">
          {a.allocation.length ? (<>
            <AllocationChart data={a.allocation} currency={config.currency} />
            <ul className="space-y-1.5 text-sm mt-2">
              {a.allocation.map((x, i) => (
                <li key={x.type} className="flex justify-between gap-2">
                  <span><span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ background: ALLOC_COLORS[i % ALLOC_COLORS.length] }} />{x.type}</span>
                  <span className="tabular muted">{fmt(x.value)} · {Math.round((x.value / Math.max(a.value, 1)) * 100)}%</span>
                </li>
              ))}
            </ul>
          </>) : <Empty>Nothing yet. Add your first FD with the button above, or type it into the Investments tab.</Empty>}
        </Section>

        <Section title="⏳ Upcoming maturities" className="lg:col-span-2">
          {a.upcoming.length ? (
            <ul className="space-y-4">
              {a.upcoming.slice(0, 6).map((h, i) => (
                <li key={i}>
                  <div className="flex justify-between text-sm gap-2">
                    <span className="min-w-0">
                      <span className="font-medium">{h.name}</span>
                      <span className="muted text-xs"> · {h.institution || h.type}{h.rate ? ` · ${pct(h.rate)}` : ""}</span>
                      {h.autoRenew && <span className="chip soft ml-1">auto-renew{h.renewals ? ` ×${h.renewals}` : ""}</span>}
                    </span>
                    <span className="text-right shrink-0">
                      <span className="tabular font-medium">{fmt(h.maturityValue)}</span>
                      <span className={`block text-xs ${h.daysLeft! <= 7 ? "text-warn" : "muted"}`}>{prettyDate(h.periodEnd)} · {countdown(h.daysLeft!)}</span>
                    </span>
                  </div>
                  <div className="mt-1.5"><ProgressBar value={h.progress} tone={h.daysLeft! <= 7 ? "warn" : "accent"} /></div>
                  <div className="text-xs muted mt-0.5">
                    {fmt(h.principal)} → +{fmt(h.expectedInterest)} interest
                    {h.payout === "Monthly" ? ` (paid ${fmt(h.monthlyPayout)} monthly)` : h.payout === "Yearly" ? " (paid yearly)" : ""}
                    {` · ${Math.round(h.progress * 100)}% of the term done`}
                  </div>
                </li>
              ))}
            </ul>
          ) : <Empty>No fixed deposits, bills or bonds with a maturity date yet.</Empty>}
        </Section>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Section title="All holdings" className="lg:col-span-2">
          {a.active.length ? (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm min-w-[560px]">
                <thead><tr className="text-left kicker">
                  <th className="py-1.5 px-1 font-medium">Name</th><th className="px-1 font-medium text-right">Put in</th>
                  <th className="px-1 font-medium text-right">Rate</th><th className="px-1 font-medium text-right">Worth now</th>
                  <th className="px-1 font-medium text-right">Earned</th><th className="px-1 font-medium text-right">Matures</th>
                </tr></thead>
                <tbody>
                  {[...a.active].sort((x, y) => y.value - x.value).map((h, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="py-2 px-1"><div className="font-medium">{h.name}</div><div className="text-xs muted">{h.type}{h.institution ? ` · ${h.institution}` : ""}</div></td>
                      <td className="px-1 text-right tabular">{fmt(h.amount)}</td>
                      <td className="px-1 text-right tabular muted">{h.rate ? pct(h.rate) : "—"}</td>
                      <td className="px-1 text-right tabular">{fmt(h.value)}</td>
                      <td className={`px-1 text-right tabular ${h.earned < 0 ? "text-bad" : "text-good"}`}>{h.earned ? `${h.earned > 0 ? "+" : "−"}${fmt(Math.abs(h.earned))}` : "—"}</td>
                      <td className="px-1 text-right text-xs muted">{h.periodEnd ? <>{prettyDate(h.periodEnd, { day: "numeric", month: "short", year: "2-digit" })}<br />{countdown(h.daysLeft!)}</> : isInterestType(h.type) ? "any time" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs muted mt-3">FD interest is worked out from the rate and dates (before tax). For shares, unit trusts and gold, update <b>Current Value</b> in the sheet when you check the price.</p>
            </div>
          ) : <Empty>No active investments yet.</Empty>}
        </Section>

        <Section title="🌱 Planned FDs & investments">
          {a.planned.length ? (
            <ul className="space-y-3 text-sm">
              {a.planned.map((h, i) => {
                const d = h.start ? daysBetween(today, h.start) : null;
                return (
                  <li key={i}>
                    <div className="flex justify-between gap-2"><span className="font-medium">{h.name}</span><span className="tabular">{fmt(h.amount)}</span></div>
                    <div className="text-xs muted">
                      {h.institution || h.type}{h.rate ? ` · ${pct(h.rate)}` : ""}{h.termMonths ? ` · ${h.termMonths} months` : ""}
                      {d !== null ? ` · ${d >= 0 ? `start ${relativeDays(d)}` : `was due ${relativeDays(d)}`}` : ""}
                    </div>
                    {h.expectedInterest > 0 && <div className="text-xs text-good">→ about {fmt(h.maturityValue)} at the end (+{fmt(h.expectedInterest)})</div>}
                  </li>
                );
              })}
              <li className="flex justify-between pt-2 border-t font-semibold" style={{ borderColor: "var(--border)" }}><span>Money to set aside</span><span className="tabular">{fmt(a.plannedTotal)}</span></li>
            </ul>
          ) : <Empty>Planning an FD? Add it with Status <b>Planned</b> (or a future start date) and it shows up here with a countdown.</Empty>}
        </Section>
      </div>
    </div>
  );
}
