import { HabitForm } from "@/components/forms2";
import { DemoBanner, PageHeader, Section, Stat } from "@/components/ui";
import { config } from "@/lib/config";
import { prettyDate } from "@/lib/dates";
import { analyseHabits, loadHabits, type HabitDay } from "@/lib/life";

export const dynamic = "force-dynamic";

function Row({ label, days, cell }: { label: string; days: HabitDay[]; cell: (d: HabitDay) => { level: number; title: string } }) {
  return (
    <div>
      <div className="text-sm font-medium mb-2">{label}</div>
      <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(30, minmax(0, 1fr))" }}>
        {days.map((d) => {
          const c = cell(d);
          const bg = c.level < 0 ? "var(--border)" : `color-mix(in srgb, var(--series-3) ${20 + c.level * 80}%, transparent)`;
          return <div key={d.date} title={`${prettyDate(d.date)}: ${c.title}`} className="aspect-square rounded-[3px]" style={{ background: bg, opacity: c.level < 0 ? 0.5 : 1 }} />;
        })}
      </div>
    </div>
  );
}

export default async function HabitsPage() {
  const { demo, days } = await loadHabits();
  const a = analyseHabits(days);
  const s = config.sleepTarget, w = config.waterTarget;
  return (
    <div className="space-y-5">
      <PageHeader title="✅ Habits" subtitle={`Sleep ${s}h+, water ${w}+ glasses, and the gym`} />
      {demo && <DemoBanner what="Life sheet" />}

      <Section title={a.today ? "Today's check-in (update)" : "Today's check-in"}>
        <HabitForm sleepTarget={s} waterTarget={w} />
      </Section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="😴 Sleep streak" value={`${a.sleepStreak} day${a.sleepStreak === 1 ? "" : "s"}`} hint={`avg ${a.avgSleep.toFixed(1)} h this week`} tone={a.avgSleep >= s ? "good" : a.avgSleep >= s - 1 ? "warn" : "bad"} />
        <Stat label="💧 Water streak" value={`${a.waterStreak} day${a.waterStreak === 1 ? "" : "s"}`} hint={`avg ${a.avgWater.toFixed(1)} glasses this week`} tone={a.avgWater >= w ? "good" : "warn"} />
        <Stat label="🏋️ Gym this week" value={`${a.gymThisWeek} time${a.gymThisWeek === 1 ? "" : "s"}`} hint={`${a.gym30} sessions in 30 days`} tone={a.gymThisWeek >= 3 ? "good" : undefined} />
        <Stat label="🔥 Gym streak" value={`${a.gymWeeks} week${a.gymWeeks === 1 ? "" : "s"}`} hint="weeks in a row with 3+ sessions" />
      </div>

      <Section title="Last 30 days">
        <div className="space-y-5">
          <Row label="😴 Sleep" days={a.last30} cell={(d) => d.sleep === null ? { level: -1, title: "not logged" } : { level: Math.min(1, d.sleep / s), title: `${d.sleep} h` }} />
          <Row label="💧 Water" days={a.last30} cell={(d) => d.water === null ? { level: -1, title: "not logged" } : { level: Math.min(1, d.water / w), title: `${d.water} glasses` }} />
          <Row label="🏋️ Gym" days={a.last30} cell={(d) => d.gym === null ? { level: -1, title: "not logged" } : { level: d.gym ? 1 : 0, title: d.gym ? "went" : "rest day" }} />
        </div>
        <div className="flex justify-between text-xs muted mt-3"><span>{prettyDate(a.last30[0].date, { day: "numeric", month: "short" })}</span><span>Darker = closer to your goal · grey = not logged</span><span>Today</span></div>
      </Section>
    </div>
  );
}
