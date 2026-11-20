import { StudyHoursChart } from "@/components/charts";
import { LogStudyForm } from "@/components/forms";
import { DemoBanner, Empty, PageHeader, ProgressBar, Section, Stat, StatusChip } from "@/components/ui";
import { prettyDate } from "@/lib/dates";
import { analyseStudies, loadStudies } from "@/lib/studies";
import { loadEvents } from "@/lib/calendar";
import { studyNudges, type Nudge } from "@/lib/nudges";

const BUBBLE: Record<Nudge["level"], string> = { fire: "#fb7185", warn: "#fbbf24", info: "#22d3ee", good: "#34d399" };
function NudgeBot({ nudges }: { nudges: Nudge[] }) {
  if (!nudges.length) return null;
  return (
    <section className="card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl grid place-items-center text-xl" style={{ background: "linear-gradient(135deg,#8b5cf6,#ec4899)", boxShadow: "0 0 18px rgba(236,72,153,.45)" }}>🤖</div>
        <div><h2 className="font-semibold">Deadline bot</h2><div className="text-xs muted">online · judging your progress</div></div>
      </div>
      <div className="space-y-2.5">
        {nudges.map((n, i) => (
          <div key={i} className="rise max-w-3xl rounded-2xl rounded-tl-md px-4 py-3 text-[0.95rem] leading-relaxed" style={{ animationDelay: `${i * 0.12}s`, background: `color-mix(in srgb, ${BUBBLE[n.level]} 11%, rgba(13,16,32,.7))`, border: `1px solid color-mix(in srgb, ${BUBBLE[n.level]} 40%, transparent)`, boxShadow: n.level === "fire" ? `0 0 18px color-mix(in srgb, ${BUBBLE[n.level]} 30%, transparent)` : undefined }}>{n.text}</div>
        ))}
      </div>
    </section>
  );
}

export const dynamic = "force-dynamic";

export default async function StudiesPage() {
  let data;
  try { data = await loadStudies(); } catch (e) {
    return <div><PageHeader title="📚 Studies & Research" /><div className="card p-5 text-bad text-sm">Couldn&apos;t read your studies sheet: {String(e).slice(0, 300)}</div></div>;
  }
  const a = analyseStudies(data.deadlines, data.tasks, data.log, data.targets);
  const cal = await loadEvents(22).catch(() => ({ events: [] }));
  const nudges = studyNudges(a, data.tasks, cal.events);
  const subjects = [...new Set([...data.tasks.map((t) => t.subject), ...data.log.map((l) => l.subject)].filter(Boolean))];
  const message = a.overall === "On track"
    ? `You're on track! 🎉 At your usual ${a.avg14.toFixed(1)} h/day you can finish everything before each deadline.`
    : a.overall === "Tight"
      ? `It's getting tight. You'll need about ${a.maxNeed.toFixed(1)} h/day to finish in time (you've been averaging ${a.avg14.toFixed(1)} h).`
      : `You're behind on ${a.deadlineStatus.filter((d) => d.status === "Behind").map((d) => d.title).join(", ")}. Aim for about ${a.maxNeed.toFixed(1)} h/day (you've averaged ${a.avg14.toFixed(1)} h). You can catch up, start with the list below! 💪`;

  return (
    <div className="space-y-5">
      <PageHeader title="📚 Studies & Research" subtitle="Countdowns, progress and what to do next">
        <LogStudyForm subjects={subjects} />
      </PageHeader>
      {data.demo && <DemoBanner what="studies sheet" />}

      <div className="card p-5 flex items-start gap-3">
        <StatusChip status={a.overall} />
        <p className="text-sm">{message}</p>
      </div>

      <NudgeBot nudges={nudges} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Studied this week" value={`${a.week} h`} hint={`target ${a.weekTarget} h (last 7 days)`} tone={a.week >= a.weekTarget ? "good" : a.week >= a.weekTarget * 0.6 ? "warn" : "bad"} />
        <Stat label="Daily average (14 days)" value={`${a.avg14.toFixed(1)} h`} hint={`target ${a.avgTarget14.toFixed(1)} h · today's goal ${a.target} h`} />
        <Stat label="Days with no study" value={a.zeroDays} hint={`last 14 days · ${Math.round(a.wastedHours)} h below target`} tone={a.zeroDays > 3 ? "bad" : a.zeroDays > 1 ? "warn" : "good"} />
        <Stat label="Tasks done" value={`${a.done} / ${a.done + a.todo.length}`} hint={`streak: ${a.streak} day${a.streak === 1 ? "" : "s"} in a row`} />
      </div>

      <Section title="⏳ Countdown">
        {a.deadlineStatus.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {a.deadlineStatus.map((d) => (
              <div key={d.title} className="rounded-xl p-4" data-tile="">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs muted">{d.type} · {d.subject}</div>
                    <div className="font-medium text-sm">{d.title}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-semibold tabular ${d.daysLeft <= 3 ? "text-bad" : d.daysLeft <= 7 ? "text-warn" : ""}`}>{d.daysLeft}</div>
                    <div className="text-[10px] muted">day{d.daysLeft === 1 ? "" : "s"} left</div>
                  </div>
                </div>
                <div className="mt-3"><ProgressBar value={d.total ? d.doneCount / d.total : 0} tone={d.status === "Behind" ? "bad" : d.status === "Tight" ? "warn" : "good"} /></div>
                <div className="flex justify-between items-center mt-2 text-xs muted">
                  <span>{d.doneCount}/{d.total} tasks · {d.remaining} h left</span>
                  <StatusChip status={d.status} />
                </div>
                <div className="text-xs muted mt-1">{prettyDate(d.due, { weekday: "short", day: "numeric", month: "short" })}</div>
              </div>
            ))}
          </div>
        ) : <Empty>No upcoming exams or submissions. Add them to the Deadlines tab.</Empty>}
      </Section>

      <div className="grid lg:grid-cols-3 gap-5">
        <Section title="⭐ Do these first">
          {a.priorities.length ? (
            <ol className="space-y-3">
              {a.priorities.map((p, i) => (
                <li key={p.task} className="flex gap-3">
                  <span className="w-6 h-6 shrink-0 rounded-full soft grid place-items-center text-xs font-semibold">{i + 1}</span>
                  <div><div className="text-sm font-medium">{p.task}</div><div className="text-xs muted">{p.subject} · {p.reason}</div></div>
                </li>
              ))}
            </ol>
          ) : <Empty>Nothing left to do. 🎉</Empty>}
        </Section>
        <Section title="Study hours (last 4 weeks)" className="lg:col-span-2">
          <StudyHoursChart data={a.daily} />
        </Section>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Section title="By subject">
          <div className="space-y-3">
            {a.subjects.map((s) => (
              <div key={s.subject}>
                <div className="flex justify-between text-sm mb-1"><span className="font-medium">{s.subject}</span><span className="muted tabular">{s.done}/{s.total} · {s.hours28} h</span></div>
                <ProgressBar value={s.total ? s.done / s.total : 0} />
              </div>
            ))}
          </div>
          <p className="text-xs muted mt-3">Hours are from the last 28 days.</p>
        </Section>
        <Section title={`To do (${a.todo.length})`}>
          <ul className="space-y-1.5 text-sm">{a.todo.map((t) => <li key={t.task} className="flex justify-between gap-2"><span>○ {t.task}</span><span className="muted text-xs shrink-0">{t.subject}</span></li>)}</ul>
        </Section>
        <Section title={`Finished (${a.finished.length})`}>
          <ul className="space-y-1.5 text-sm">{a.finished.map((t) => <li key={t.task} className="flex justify-between gap-2"><span className="muted line-through">✓ {t.task}</span><span className="muted text-xs shrink-0">{t.doneOn ? prettyDate(t.doneOn, { day: "numeric", month: "short" }) : ""}</span></li>)}</ul>
        </Section>
      </div>
    </div>
  );
}
