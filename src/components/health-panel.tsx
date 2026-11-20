import { HeartChart, StepsChart } from "@/components/charts";
import { CountUp, Ring } from "@/components/fx";
import { Hype } from "@/components/hype";
import { Empty, ProgressBar, Section, Stat } from "@/components/ui";
import { config } from "@/lib/config";
import { addDays, prettyDate, todayISO } from "@/lib/dates";
import { WorkoutLogger } from "@/components/forms2";
import { analyseHealth, healthHype, heartFlags, isGymWorkout, workoutKind, KIND_ICON, WEEK_TARGET, WORKOUT_CHOICES, workoutPlan, type HealthDay } from "@/lib/health";

const k = (n: number | null | undefined) => (n == null ? "–" : Math.round(n).toLocaleString("en-US"));

/** Apple Watch section of the Body & Health tab: steps, heart-rate check, workout summary and what to train next. */
export function HealthPanel({ days, demo, hypeOffset = 0 }: { days: HealthDay[]; demo: boolean; hypeOffset?: number }) {
  const today = todayISO();
  const a = analyseHealth(days, today);
  const hype = healthHype(a, today);
  const heart = heartFlags(days, today);
  const plan = workoutPlan(days, today);
  const d = a.today ?? a.yesterday ?? a.latest;
  const dayLabel = !d ? "" : d.date === today ? "Today so far" : d.date === addDays(today, -1) ? "Yesterday" : prettyDate(d.date);
  const label = (iso: string) => prettyDate(iso, { day: "numeric", month: "short" });
  const range = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29));
  const steps = range.map((date, i) => ({ label: label(date), steps: a.last30[i]?.steps ?? null }));
  const hr = range.map((date, i) => ({ label: label(date), resting: a.last30[i]?.restingHr ?? null, avg: a.last30[i]?.avgHr ?? null, max: a.last30[i]?.maxHr ?? null }));
  const g = { steps: config.stepGoal, move: config.moveGoal, ex: config.exerciseGoal };
  // A day the watch saw exercise but no workout was logged: ask what it was.
  const unlogged = [a.today, a.yesterday].find((x) => x && (x.exerciseMin ?? 0) >= 15 && !x.workouts.length) ?? null;
  const syncChip = a.latest ? (a.daysSinceSync === 0 ? "🟢 watch synced today" : a.daysSinceSync === 1 ? "🟢 watch synced yesterday" : `🟠 last watch sync ${a.daysSinceSync} days ago`) : null;

  if (!demo && !days.length) {
    return (
      <Section title="⌚ Apple Watch">
        <Empty>Nothing synced from your watch yet. Build the iPhone Shortcut (APPLE-WATCH.md), tap ▶️ once, and your steps and heart rate land here.</Empty>
        <div className="mt-4"><div className="text-sm font-medium mb-2">💪 Log a workout</div><WorkoutLogger choices={WORKOUT_CHOICES} /></div>
      </Section>
    );
  }

  return (
    <div id="health" className="space-y-5">
      <Hype text={hype[0]} i={hypeOffset} />

      {d && (
        <Section title={`⌚ ${dayLabel}: your rings`} action={syncChip && <span className="chip text-xs">{syncChip}</span>}>
          <div className="grid grid-cols-3 gap-4 place-items-center">
            <Ring value={(d.steps ?? 0) / g.steps} label="👟 Steps" sub={`goal ${k(g.steps)}`} tone={(d.steps ?? 0) >= g.steps ? "good" : "warn"}>
              <span className="text-lg font-semibold tabular"><CountUp value={d.steps ?? 0} /></span>
            </Ring>
            <Ring value={(d.activeKcal ?? 0) / g.move} label="🔥 Move" sub={`goal ${g.move} kcal`} tone="bad">
              <span className="text-lg font-semibold tabular">{k(d.activeKcal)}<span className="text-xs muted"> kcal</span></span>
            </Ring>
            <Ring value={(d.exerciseMin ?? 0) / g.ex} label="⚡ Exercise" sub={`goal ${g.ex} min`} tone="good">
              <span className="text-lg font-semibold tabular">{k(d.exerciseMin)}<span className="text-xs muted"> min</span></span>
            </Ring>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-4 text-sm">
            {d.distanceKm != null && <span className="chip">📍 {d.distanceKm} km</span>}
            {d.restingHr != null && <span className="chip">❤️ resting {d.restingHr} bpm</span>}
            {d.avgHr != null && <span className="chip">💓 avg {d.avgHr} bpm</span>}
            {d.minHr != null && d.maxHr != null && <span className="chip">📉 {d.minHr} – {d.maxHr} bpm 📈</span>}
            {d.workouts.map((w, i) => <span key={i} className="chip">{KIND_ICON[workoutKind(w.type)]} {w.type} · {Math.round(w.minutes)} min</span>)}
          </div>
        </Section>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="👟 Avg steps (7 days)" value={k(a.avgSteps7)} hint={a.avgSteps7 && a.avgStepsPrev7 ? `${a.avgSteps7 >= a.avgStepsPrev7 ? "▲" : "▼"} ${k(Math.abs(a.avgSteps7 - a.avgStepsPrev7))} vs last week` : `${k(a.stepsWeek)} this week`} tone={a.avgSteps7 && a.avgSteps7 >= g.steps ? "good" : a.avgSteps7 && a.avgSteps7 >= g.steps * 0.7 ? "warn" : undefined} />
        <Stat label="🔥 Step-goal streak" value={`${a.goalStreak} day${a.goalStreak === 1 ? "" : "s"}`} hint={a.best?.steps ? `best ever: ${k(a.best.steps)} (${label(a.best.date)})` : undefined} tone={a.goalStreak >= 3 ? "good" : undefined} />
        <Stat label="❤️ Resting HR (7 days)" value={a.restingAvg7 ? `${Math.round(a.restingAvg7)} bpm` : "–"} hint={a.restingAvg30 ? `month avg ${Math.round(a.restingAvg30)} · lower = fitter` : "lower = fitter"} tone={a.restingAvg7 && a.restingAvg30 && a.restingAvg7 <= a.restingAvg30 ? "good" : undefined} />
        <Stat label="🏋️ Workouts this week" value={plan.week} hint={`${plan.weekMin} min · ${plan.month} in 4 weeks`} tone={plan.week >= 3 ? "good" : undefined} />
      </div>

      <Section title="👟 Daily steps, last 30 days">
        <StepsChart data={steps} goal={g.steps} />
      </Section>

      <Hype text={hype[1]} i={hypeOffset + 1} />

      <div className="grid lg:grid-cols-2 gap-5">
        <Section title="💓 Heart check (last 14 days)">
          {heart.flags.length ? (
            <ul className="space-y-3 mb-4">
              {heart.flags.slice(0, 5).map((f, i) => (
                <li key={i} className="rounded-xl p-3 text-sm" style={{ background: `color-mix(in srgb, var(--${f.level === "warn" ? "bad" : "warn"}) 12%, transparent)`, border: `1px solid color-mix(in srgb, var(--${f.level === "warn" ? "bad" : "warn"}) 35%, transparent)` }}>
                  <div className="flex justify-between gap-2 font-medium"><span>{f.level === "warn" ? "🚩" : "👀"} {f.title}</span><span className="muted text-xs whitespace-nowrap">{prettyDate(f.date)}</span></div>
                  <p className="muted text-xs mt-1">{f.detail}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm mb-4">✅ <b>All normal.</b> {heart.checked ? `Checked ${heart.checked} days` : "No heart data yet"}{heart.baseline ? `, your usual resting rate is ~${heart.baseline} bpm` : ""}. Heart of a queen 👑</p>
          )}
          {days.some((x) => x.restingHr || x.avgHr) ? <HeartChart data={hr} /> : <Empty>No heart rate yet.</Empty>}
          <p className="text-[11px] muted mt-2">Not medical advice: this just spots numbers that are unusual for you. Your watch also has its own high/low heart-rate alerts (Watch app → Heart).</p>
        </Section>

        <Section title="🏋️‍♀️ Workouts & what to train next">
          <div className="mb-4">
            <div className="text-sm font-medium mb-2">{unlogged ? `⌚ Your watch saw ${unlogged.exerciseMin} exercise min ${unlogged.date === today ? "today" : "yesterday"}. What did you train?` : "💪 What did you train?"}</div>
            <WorkoutLogger choices={WORKOUT_CHOICES} minutes={unlogged?.exerciseMin ?? undefined} date={unlogged?.date} />
          </div>
          <div className="rounded-xl p-4 mb-4 soft">
            <div className="kicker mb-1">next up</div>
            <div className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>{plan.next.title}</div>
            <p className="text-sm mt-1">{plan.next.how}</p>
            <p className="text-xs muted mt-2">{plan.next.why}</p>
            {plan.alsoNote && <p className="text-xs text-warn mt-2">{plan.alsoNote}</p>}
          </div>
          <div className="space-y-3 mb-4">
            {([
              ["Strength", `${plan.byKind[0].week.n} / ${WEEK_TARGET.Strength} sessions`, plan.progress.Strength],
              ["Cardio", `${plan.cardioMin} / ${WEEK_TARGET.Cardio} min`, plan.progress.Cardio],
              ["Mobility", `${plan.byKind[2].week.n} / ${WEEK_TARGET.Mobility} session`, plan.progress.Mobility],
            ] as const).map(([kind, txt, p]) => (
              <div key={kind}>
                <div className="flex justify-between text-sm mb-1"><span>{KIND_ICON[kind]} {kind} this week</span><span className="muted tabular">{txt}</span></div>
                <ProgressBar value={p} tone={p >= 1 ? "good" : p >= 0.5 ? "accent" : "warn"} />
              </div>
            ))}
          </div>
          {plan.topTypes.length > 0 && (
            <div className="text-sm mb-3">
              <div className="kicker mb-1">last 4 weeks</div>
              <div className="flex flex-wrap gap-2">{plan.topTypes.map((t) => <span key={t.type} className="chip">{KIND_ICON[workoutKind(t.type)]} {t.type} ×{t.n} · {t.min} min</span>)}</div>
            </div>
          )}
          {a.recentWorkouts.length ? (
            <details className="text-sm">
              <summary className="cursor-pointer muted">Every workout, last 2 weeks ({a.recentWorkouts.length})</summary>
              <ul className="space-y-1.5 mt-2">
                {a.recentWorkouts.map((w, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span>{KIND_ICON[workoutKind(w.type)]} {w.type}{isGymWorkout(w) && <span className="chip ml-2 text-[11px]">gym ✓</span>}</span>
                    <span className="muted tabular whitespace-nowrap">{Math.round(w.minutes)} min · {prettyDate(w.date)}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : <Empty>No workouts in the last 2 weeks. Your watch has a Workout app, just saying 👀</Empty>}
        </Section>
      </div>
    </div>
  );
}
