import { EventRow } from "@/components/event-list";
import { AddBirthdayForm, AddEventForm } from "@/components/forms";
import { DemoBanner, Empty, PageHeader, Section } from "@/components/ui";
import { CATEGORIES, CATEGORY_DOT, CATEGORY_STYLE, loadEvents, type CalEvent } from "@/lib/calendar";
import { addDays, prettyDate, relativeDays, daysBetween, todayISO } from "@/lib/dates";
import { loadFinance, upcomingBills } from "@/lib/finance";
import { loadStudies } from "@/lib/studies";
import { loadBirthdays, nextBirthday } from "@/lib/life";

export const dynamic = "force-dynamic";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams;
  const today = todayISO();
  const [cal, fin, stu, bdays] = await Promise.all([
    loadEvents(45),
    loadFinance().catch(() => null),
    loadStudies().catch(() => null),
    loadBirthdays().catch(() => ({ demo: false, items: [] })),
  ]);
  const birthdays = bdays.items.map((b) => ({ ...b, next: nextBirthday(b, today) })).sort((a, b) => a.next.days - b.next.days);
  // Bills (from your finance sheet) and exams/submissions (from your studies sheet) appear here too.
  const extra: CalEvent[] = [
    ...(fin ? upcomingBills(fin.bills, 45).map((b) => ({ id: "bill-" + b.key, date: b.due, time: null, endTime: null, title: `${b.name} due`, category: b.type === "Subscription" ? "Subscription" : "Bill", location: "", source: "sheet" })) : []),
    ...(stu ? stu.deadlines.filter((d) => d.due >= today && daysBetween(today, d.due) <= 45).map((d) => ({ id: "dl-" + d.title, date: d.due, time: null, endTime: null, title: d.title, category: d.type.toLowerCase().startsWith("exam") ? "Exam" : "Deadline", location: d.notes, source: "sheet" })) : []),
  ];
  const seen = new Set(cal.events.map((e) => `${e.date}|${e.title.toLowerCase()}`));
  // Skip a sheet item if your calendar already has an event that day with the same first word (e.g. "Electricity").
  const dup = (e: CalEvent) => seen.has(`${e.date}|${e.title.toLowerCase()}`) ||
    cal.events.some((c) => c.date === e.date && c.title.toLowerCase().includes(e.title.toLowerCase().split(/[\s(]/)[0]));
  let events = [...cal.events, ...extra.filter((e) => !dup(e))]
    .filter((e) => e.date >= today)
    .sort((a, b) => (a.date + (a.time || "00:00")).localeCompare(b.date + (b.time || "00:00")));
  if (show) events = events.filter((e) => e.category === show);
  const used = [...new Set([...cal.events, ...extra].map((e) => e.category))];

  // Group by day
  const days = new Map<string, CalEvent[]>();
  for (const e of events) days.set(e.date, [...(days.get(e.date) || []), e]);

  // 2-week mini grid starting Monday
  const dow = (new Date(today + "T12:00:00Z").getUTCDay() + 6) % 7;
  const start = addDays(today, -dow);
  const grid = Array.from({ length: 21 }, (_, i) => addDays(start, i));

  return (
    <div className="space-y-5">
      <PageHeader title="📅 Calendar" subtitle="Your Google Calendar, plus bills and deadlines from your sheets">
        <AddEventForm categories={CATEGORIES} />
      </PageHeader>
      {cal.demo && <DemoBanner what="Google Calendar" />}
      {cal.error && <div className="card p-4 text-sm text-bad">Couldn&apos;t read a calendar: {cal.error.slice(0, 240)}</div>}

      <div className="flex flex-wrap gap-2">
        <a href="/calendar" className={`chip ${!show ? "soft" : "muted"}`}>All</a>
        {used.map((c) => <a key={c} href={`/calendar?show=${c}`} className={`chip ${show === c ? CATEGORY_STYLE[c] : "muted"}`}>{c}</a>)}
      </div>

      <Section title="Next 3 weeks">
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] muted mb-1">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d}>{d}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((d) => {
            const evs = days.get(d) || [];
            const past = d < today;
            return (
              <a key={d} href={evs.length ? `#d-${d}` : undefined} className={`rounded-lg p-1.5 min-h-14 text-left ${d === today ? "ring-2 ring-accent" : ""} ${past ? "opacity-40" : ""}`} data-tile="">
                <div className="text-xs font-semibold">{Number(d.slice(8, 10))}</div>
                <div className="flex flex-wrap gap-0.5 mt-1">{evs.slice(0, 4).map((e) => <span key={e.id} title={e.title} className="w-2 h-2 rounded-full" style={{ background: CATEGORY_DOT[e.category] || CATEGORY_DOT.Other }} />)}</div>
                {evs.length > 0 && <div className="hidden md:block text-[10px] muted truncate mt-0.5">{evs[0].title}</div>}
              </a>
            );
          })}
        </div>
      </Section>

      <Section title="Agenda">
        {days.size === 0 ? <Empty>Nothing coming up.</Empty> : (
          <div className="space-y-5">
            {[...days.entries()].map(([d, evs]) => (
              <div key={d} id={`d-${d}`} className="scroll-mt-4">
                <div className="text-sm font-semibold mb-1">{prettyDate(d, { weekday: "long", day: "numeric", month: "short" })} <span className="muted font-normal">· {relativeDays(daysBetween(today, d))}</span></div>
                <ul className="divide-y" style={{ borderColor: "var(--border)" }}>{evs.map((e) => <EventRow key={e.id} e={e} />)}</ul>
              </div>
            ))}
          </div>
        )}
      </Section>
      <Section title="🎂 Birthdays">
        <div className="mb-3"><AddBirthdayForm /></div>
        {birthdays.length === 0 ? (
          <Empty>No birthdays yet. Add them here (they go to the &quot;Birthdays&quot; tab of your Life sheet).</Empty>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {birthdays.map((b) => (
              <li key={b.name + b.next.date} className="flex items-center gap-3 py-2">
                <div className="text-xl">{b.next.days === 0 ? "🥳" : "🎂"}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{b.name}{b.next.turning ? <span className="muted font-normal"> · turns {b.next.turning}</span> : null}</div>
                  <div className="text-xs muted truncate">{prettyDate(b.next.date, { day: "numeric", month: "long" })}{b.note ? ` · ${b.note}` : ""}</div>
                </div>
                <span className={`chip shrink-0 ${b.next.days <= 7 ? CATEGORY_STYLE.Birthday : "muted"}`}>{b.next.days === 0 ? "Today!" : relativeDays(b.next.days)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs muted mt-2">Why not straight from Google Calendar? Google keeps birthdays private to you, so the planner&apos;s robot account can&apos;t see them even though your calendar is shared with it.</p>
      </Section>
      <p className="text-xs muted">Tip: in Google Calendar, start a title with a tag like <code>[Gym]</code>, <code>[Exam]</code> or <code>[Bill]</code> to set its colour here.</p>
    </div>
  );
}
