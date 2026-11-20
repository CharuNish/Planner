import Link from "next/link";
import { EventRow } from "@/components/event-list";
import { Empty, ProgressBar, Section, Stat, StatusChip } from "@/components/ui";
import { loadEvents } from "@/lib/calendar";
import { config } from "@/lib/config";
import { addDays, daysBetween, prettyDate, relativeDays, todayISO } from "@/lib/dates";
import { analyseFinance, fmt, loadFinance, upcomingBills } from "@/lib/finance";
import { quoteOfTheDay } from "@/lib/quotes";
import { analyseStudies, loadStudies } from "@/lib/studies";
import { CountUp, Ring } from "@/components/fx";
import { analyseHabits, analyseWeight, getCountdown, loadHabits, loadWeight } from "@/lib/life";
import { Countdown } from "@/components/countdown";

export const dynamic = "force-dynamic";

function greeting() {
  const h = Number(new Date().toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: config.timezone }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function Home() {
  const today = todayISO();
  const [fin, stu, cal, hab, wt, cd] = await Promise.all([
    loadFinance().catch((e) => ({ error: String(e) })),
    loadStudies().catch((e) => ({ error: String(e) })),
    loadEvents(14).catch((e) => ({ demo: false, events: [], error: String(e) })),
    loadHabits().catch(() => null),
    loadWeight().catch(() => null),
    getCountdown(),
  ]);
  const h = hab ? analyseHabits(hab.days) : null;
  const w = wt ? analyseWeight(wt.entries) : null;
  const f = "txns" in fin ? analyseFinance(fin.txns, fin.budgets) : null;
  const bills = "bills" in fin ? upcomingBills(fin.bills, 7) : [];
  const s = "tasks" in stu ? analyseStudies(stu.deadlines, stu.tasks, stu.log, stu.targets) : null;
  const todays = cal.events.filter((e) => e.date === today);
  const tomorrow = cal.events.filter((e) => e.date === addDays(today, 1));
  const nextDeadline = s?.deadlineStatus.find((d) => d.status !== "Done");
  const anyDemo = ("demo" in fin && fin.demo) || ("demo" in stu && stu.demo) || cal.demo;

  return (
    <div className="space-y-5 rise">
      <section className="card p-6 md:p-8 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(600px 240px at 0% 0%, rgba(139,92,246,.25), transparent 70%), radial-gradient(500px 240px at 100% 100%, rgba(34,211,238,.15), transparent 70%)" }} />
        <div className="relative grid lg:grid-cols-[1.1fr_1fr] gap-8 items-center">
          <div>
            <div className="kicker">{prettyDate(today, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · system online <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--good)] align-middle animate-pulse" /></div>
            <h1 className="text-3xl md:text-5xl font-semibold tracking-tight mt-3 leading-tight">{greeting()},<br /><span className="gradient-text glow-text">{config.ownerName}</span> ✦</h1>
            <p className="mt-4 text-sm muted italic max-w-md">“{quoteOfTheDay(today)}”</p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              <span className="chip soft">📅 {todays.length} event{todays.length === 1 ? "" : "s"} today</span>
              {nextDeadline && <span className="chip soft">⏳ {nextDeadline.title}: {relativeDays(nextDeadline.daysLeft)}</span>}
              {bills.length > 0 && <span className="chip soft">🧾 {bills.length} bill{bills.length === 1 ? "" : "s"} this week</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-4 justify-items-center">
            <Ring value={f && f.totalBudget ? Math.max(0, f.budgetLeft) / f.totalBudget : 0} tone={f && f.budgetLeft / Math.max(f.totalBudget, 1) < 1 - f.dom / f.dim - 0.1 ? "warn" : "accent"} size={104} label="Budget left" sub={f ? `day ${f.dom}/${f.dim}` : ""} />
            <Ring value={s && s.target ? s.hoursToday / s.target : 0} tone="good" size={104} label="Study today" sub={s ? `goal ${s.target} h` : ""}>
              <span className="text-lg font-semibold tabular">{s ? s.hoursToday : 0}<span className="text-xs muted">h</span></span>
            </Ring>
            <Ring value={h?.today ? ((h.today.sleep ? Math.min(1, h.today.sleep / config.sleepTarget) : 0) + (h.today.water ? Math.min(1, h.today.water / config.waterTarget) : 0) + (h.today.gym ? 1 : 0)) / 3 : 0} tone="accent" size={104} label="Habits today" sub={h ? `${h.sleepStreak}d sleep streak` : ""} />
            <Ring value={w && w.goal && w.start.kg > w.goal ? (w.start.kg - w.current.kg) / (w.start.kg - w.goal) : w ? Math.min(1, Math.max(0, w.lost) / 5) : 0} tone="good" size={104} label="Weight goal" sub={w ? `${w.current.kg} kg now` : ""}>
              <span className="text-lg font-semibold tabular">{w ? (w.lost > 0 ? `-${w.lost}` : "0") : "–"}<span className="text-xs muted">kg</span></span>
            </Ring>
          </div>
        </div>
      </section>
      <Countdown date={cd.date} label={cd.label} />
      {anyDemo && <div className="rounded-xl px-4 py-3 text-sm soft">👀 Some tabs show <b>sample data</b> until your Google Sheets and Calendar are connected (see SETUP.md).</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Budget left" value={f ? <CountUp value={Math.round(f.budgetLeft)} prefix={`${config.currency} `} /> : "—"} tone={f && f.budgetLeft < 0 ? "bad" : undefined}
          hint={f ? `about ${fmt(f.perDayAllowance)} a day for ${f.dim - f.dom + 1} days` : "error loading"} />
        <Stat label="Spent today" value={f ? <CountUp value={Math.round(f.spentToday)} prefix={`${config.currency} `} /> : "—"} hint={f ? `${fmt(f.expense)} so far this month` : ""} />
        <Stat label="Next deadline" value={nextDeadline ? relativeDays(nextDeadline.daysLeft) : "None 🎉"}
          hint={nextDeadline ? nextDeadline.title : "nothing coming up"} tone={nextDeadline && nextDeadline.daysLeft <= 3 ? "warn" : undefined} />
        <Stat label="Studied today" value={s ? <CountUp value={s.hoursToday} decimals={1} suffix=" h" /> : "—"} hint={s ? `goal today ${s.target} h · streak ${s.streak} day${s.streak === 1 ? "" : "s"}` : ""} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Section title="📅 Today" action={<Link href="/calendar" className="text-xs text-accent">Calendar →</Link>} className="lg:col-span-2">
          {todays.length ? <ul className="divide-y" style={{ borderColor: "var(--border)" }}>{todays.map((e) => <EventRow key={e.id} e={e} />)}</ul> : <Empty>Nothing scheduled today. Enjoy! 🌿</Empty>}
          {tomorrow.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-semibold muted mb-1">Tomorrow</div>
              <ul>{tomorrow.slice(0, 4).map((e) => <EventRow key={e.id} e={e} />)}</ul>
            </div>
          )}
          {cal.error && <p className="text-xs text-bad mt-2">Calendar error: {cal.error.slice(0, 160)}</p>}
        </Section>

        <Section title="⭐ Study first" action={<Link href="/studies" className="text-xs text-accent">Studies →</Link>}>
          {s?.priorities.length ? (
            <ol className="space-y-3">
              {s.priorities.slice(0, 3).map((p, i) => (
                <li key={p.task} className="flex gap-3">
                  <span className="w-6 h-6 shrink-0 rounded-full soft grid place-items-center text-xs font-semibold">{i + 1}</span>
                  <div><div className="text-sm font-medium">{p.task}</div><div className="text-xs muted">{p.reason}</div></div>
                </li>
              ))}
            </ol>
          ) : <Empty>No open tasks. You're all caught up!</Empty>}
          {s && <div className="mt-4 flex items-center gap-2 text-sm">Overall: <StatusChip status={s.overall} /></div>}
        </Section>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Section title="🧾 Bills & subscriptions this week">
          {bills.length ? (
            <ul className="space-y-2">
              {bills.map((b) => (
                <li key={b.name} className="flex justify-between text-sm gap-2">
                  <span>{b.name} <span className="muted text-xs">· {relativeDays(daysBetween(today, b.due))}</span></span>
                  <span className="tabular font-medium">{fmt(b.amount)}</span>
                </li>
              ))}
            </ul>
          ) : <Empty>No bills due in the next 7 days.</Empty>}
        </Section>

        <Section title="💰 Money check" action={<Link href="/finance" className="text-xs text-accent">Finance →</Link>}>
          {f ? (
            <div className="space-y-3 text-sm">
              <div>
                <div className="flex justify-between mb-1"><span>Budget used</span><span className="tabular">{Math.round((f.expense / Math.max(f.totalBudget, 1)) * 100)}%</span></div>
                <ProgressBar value={f.expense / Math.max(f.totalBudget, 1)} tone={f.expense > f.totalBudget ? "bad" : f.expense / f.totalBudget > f.dom / f.dim + 0.1 ? "warn" : "good"} />
                <div className="text-xs muted mt-1">{Math.round((f.dom / f.dim) * 100)}% of the month has passed</div>
              </div>
              {f.focus[0] ? <p>💡 Go easy on <b>{f.focus[0].category}</b>: {f.focus[0].reasons[0]}.</p> : <p>✅ Every category is within budget. Nice!</p>}
              {f.anomalies.length > 0 && <p className="text-warn">⚠️ {f.anomalies.length} thing{f.anomalies.length > 1 ? "s look" : " looks"} unusual. <Link href="/finance#anomalies" className="underline">Check</Link></p>}
            </div>
          ) : <Empty>Couldn&apos;t load finance data.</Empty>}
        </Section>

        <Section title="🗓️ Coming up">
          {s?.deadlineStatus.length ? (
            <ul className="space-y-2">
              {s.deadlineStatus.slice(0, 4).map((d) => (
                <li key={d.title} className="flex justify-between gap-2 text-sm">
                  <span className="truncate">{d.title}</span>
                  <span className={`tabular shrink-0 font-semibold ${d.daysLeft <= 3 ? "text-bad" : d.daysLeft <= 7 ? "text-warn" : ""}`}>{d.daysLeft}d</span>
                </li>
              ))}
            </ul>
          ) : <Empty>No exams or submissions coming up.</Empty>}
        </Section>
      </div>
    </div>
  );
}
