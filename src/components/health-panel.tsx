import { StepsChart } from "@/components/charts";
import { CountUp, Ring } from "@/components/fx";
import { Hype } from "@/components/hype";
import { StepForm, WorkoutLogger } from "@/components/forms2";
import { StepParty } from "@/components/step-party";
import { ProgressBar, Section, Stat } from "@/components/ui";
import { config } from "@/lib/config";
import { prettyDate, todayISO } from "@/lib/dates";
import { analyseHealth, healthHype, isGymWorkout, workoutKind, KIND_ICON, stepMonth, stepParty, WEEK_TARGET, WORKOUT_CHOICES, workoutPlan, type HealthDay } from "@/lib/health";

const k = (n: number | null | undefined) => (n == null ? "–" : Math.round(n).toLocaleString("en-US"));

/** Steps + workouts part of the Glow Up tab. Everything is logged by hand (no Apple Health access). */
export function HealthPanel({ days, demo, hypeOffset = 0 }: { days: HealthDay[]; demo: boolean; hypeOffset?: number }) {
  const today = todayISO();
  const a = analyseHealth(days, today);
  const hype = healthHype(a, today);
  const plan = workoutPlan(days, today);
  const month = stepMonth(days, today);
  const party = stepParty(days, today);
  const goal = config.stepGoal;
  const t = a.today?.steps ?? null;
  const y = a.yesterday?.steps ?? null;
  const shown = t ?? y;
  const shownLabel = t !== null ? "Today" : y !== null ? "Yesterday" : "Today";
  const chart = month.list.map((d) => ({ label: prettyDate(d.date, { day: "numeric", month: "short" }), steps: d.steps }));
  const vsLast = month.avg && month.prevAvg ? month.avg - month.prevAvg : null;

  return (
    <div id="health" className="space-y-5">
      {party && (
        <StepParty
          id={`steps-${party.kind}-${party.date}${demo ? "-demo" : ""}`}
          big={party.kind === "huge"}
          title={party.kind === "huge" ? `🌟 WHOA! ${k(party.steps)} steps ${party.date === today ? "today" : "yesterday"}!` : `🎊 Hurray! Step goal smashed: ${k(party.steps)} steps!`}
          sub={party.kind === "huge" ? "That's way more than your usual. Legs of steel, honestly 🦵✨" : `Goal was ${k(goal)}. Look at you go, queen 👑`}
        />
      )}

      <Hype text={hype[0]} i={hypeOffset} />

      <Section title="👟 Steps">
        <div className="grid md:grid-cols-[auto_1fr] gap-6 items-center">
          <Ring value={(shown ?? 0) / goal} size={140} label={`${shownLabel}`} sub={`goal ${k(goal)}`} tone={(shown ?? 0) >= goal ? "good" : "warn"}>
            <div className="text-center">
              <div className="text-xl font-semibold tabular"><CountUp value={shown ?? 0} /></div>
              <div className="text-[11px] muted">{(shown ?? 0) >= goal ? "goal reached ✅" : shown ? `${k(goal - shown)} to go` : "not logged"}</div>
            </div>
          </Ring>
          <div className="space-y-3">
            <div className="text-sm font-medium">Log today&apos;s steps (check your watch or Fitness app)</div>
            <StepForm last={y ?? undefined} />
            <p className="text-xs muted">Logged twice for the same day? The newest number replaces the old one.</p>
          </div>
        </div>
      </Section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={`👟 ${month.monthName} average`} value={k(month.avg)} hint={vsLast !== null ? `${vsLast >= 0 ? "▲" : "▼"} ${k(Math.abs(vsLast))} vs last month` : `${month.logged} days logged`} tone={month.avg && month.avg >= goal ? "good" : month.avg && month.avg >= goal * 0.7 ? "warn" : undefined} />
        <Stat label="🎯 Goal reached" value={`${month.goalDays} / ${month.logged || 0} days`} hint={`this month · goal ${k(goal)}`} tone={month.logged && month.goalDays / month.logged >= 0.5 ? "good" : undefined} />
        <Stat label="🔥 Goal streak" value={`${a.goalStreak} day${a.goalStreak === 1 ? "" : "s"}`} hint={month.best ? `best this month: ${k(month.best.steps)}` : undefined} tone={a.goalStreak >= 3 ? "good" : undefined} />
        <Stat label="🏋️ Workouts this week" value={plan.week} hint={`${plan.weekMin} min · ${plan.month} in 4 weeks`} tone={plan.week >= 3 ? "good" : undefined} />
      </div>

      <Section title={`📈 ${month.monthName} step trend`}>
        <StepsChart data={chart} goal={goal} />
        <p className="text-xs muted mt-2">{month.total ? `${k(month.total)} steps so far this month.` : "Log your steps to see the trend."} Bars above the dashed line hit your goal.</p>
      </Section>

      <Hype text={hype[1]} i={hypeOffset + 1} />

      <Section title="🏋️‍♀️ Workouts & what to train next">
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <div className="text-sm font-medium mb-2">💪 What did you train?</div>
            <WorkoutLogger choices={WORKOUT_CHOICES} />
            <div className="rounded-xl p-4 mt-4 soft">
              <div className="kicker mb-1">next up</div>
              <div className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>{plan.next.title}</div>
              <p className="text-sm mt-1">{plan.next.how}</p>
              <p className="text-xs muted mt-2">{plan.next.why}</p>
              {plan.alsoNote && <p className="text-xs text-warn mt-2">{plan.alsoNote}</p>}
            </div>
          </div>
          <div>
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
                <div className="flex flex-wrap gap-2">{plan.topTypes.map((w) => <span key={w.type} className="chip">{KIND_ICON[workoutKind(w.type)]} {w.type} ×{w.n} · {w.min} min</span>)}</div>
              </div>
            )}
            {a.recentWorkouts.length > 0 ? (
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
            ) : <p className="text-sm muted">No workouts in the last 2 weeks yet. First one gets a gold star ⭐</p>}
          </div>
        </div>
      </Section>
    </div>
  );
}

