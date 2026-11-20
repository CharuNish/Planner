import { WeightChart } from "@/components/charts";
import { MadeItButton, MeasureForm, WeightForm } from "@/components/forms2";
import { BodyOutline } from "@/components/body-outline";
import { Body3D } from "@/components/body3d";
import { BodyViews } from "@/components/body-views";
import { config } from "@/lib/config";
import { Hype } from "@/components/hype";
import { weightHype } from "@/lib/hype";
import { SafeImg } from "@/components/img";
import { DemoBanner, Empty, PageHeader, ProgressBar, Section, Stat } from "@/components/ui";
import { prettyDate, todayISO } from "@/lib/dates";
import { analyseMeasurements, analyseWeight, loadCookLog, loadMeasurements, loadWeight, MEASURE_LABEL, MEASURES } from "@/lib/life";
import { HealthPanel } from "@/components/health-panel";
import { loadHealth } from "@/lib/health";
import { getRecipes, isoWeek, searchRecipes, type Recipe } from "@/lib/recipes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const APPLIANCE_ICON: Record<string, string> = { "Gas cooker": "🔥", "Rice cooker": "🍚", "Air fryer": "🌀", "Sandwich maker": "🥪" };
const APPLIANCES = Object.keys(APPLIANCE_ICON);

export default async function WeightPage({ searchParams }: { searchParams: Promise<{ q?: string; shuffle?: string; use?: string }> }) {
  const { q, shuffle, use } = await searchParams;
  const today = todayISO();
  const [w, log, ms, hl] = await Promise.all([
    loadWeight().catch((e) => ({ demo: false, entries: [], error: String(e) })), loadCookLog().catch(() => ({ demo: false, log: [] })),
    loadMeasurements().catch((e) => ({ demo: false, entries: [], error: String(e) })),
    loadHealth().catch(() => ({ demo: false, days: [] })),
  ]);
  const a = analyseWeight(w.entries);
  const m = analyseMeasurements(ms.entries);
  const hype = weightHype(a, w.entries, m, today);
  let recipes: Recipe[] = [], recipeError = "";
  try { recipes = q ? await searchRecipes(q) : await getRecipes(isoWeek(today) + (shuffle ? `-${shuffle}` : "")); } catch (e) { recipeError = String(e); }
  if (use) recipes = recipes.filter((r) => r.appliances.includes(use));
  const madeNames = new Set(log.log.map((l) => l.recipe.toLowerCase()));

  return (
    <div className="space-y-5">
      <PageHeader title="💪 Body & Health" subtitle="Steps, heart and workouts from your Apple Watch, your glow-up in numbers, and real recipes for your kitchen"><WeightForm /></PageHeader>
      {w.demo && <DemoBanner what="Life sheet" />}

      <HealthPanel days={hl.days} demo={hl.demo} hypeOffset={3} />

      <h2 className="text-xl font-semibold pt-4">⚖️ Weight</h2>
      {"error" in w && w.error && <div className="card p-4 text-sm text-bad">{w.error}</div>}

      {a ? (
        <>
          <Hype text={hype[0]} i={0} />
          {a.daysSinceLast > 7 && <p className="text-sm muted -mt-2">It&apos;s been {a.daysSinceLast} days since your last weigh-in. Hop on the scale, babe!</p>}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Current" value={`${a.current.kg} kg`} hint={`on ${prettyDate(a.current.date)}`} />
            <Stat label="Lost so far" value={`${a.lost > 0 ? a.lost : 0} kg`} tone={a.lost > 0 ? "good" : undefined} hint={`since ${prettyDate(a.start.date, { day: "numeric", month: "short", year: "numeric" })} (${a.start.kg} kg)`} />
            <Stat label="Trend" value={`${a.perWeek > 0 ? "+" : ""}${a.perWeek.toFixed(2)} kg/wk`} tone={a.perWeek < -0.05 ? "good" : a.perWeek > 0.15 ? "warn" : undefined} hint="over the last 30 days" />
            {a.goal ? (
              <Stat label="To goal" value={a.toGo > 0 ? `${a.toGo.toFixed(1)} kg` : "Reached! 🏆"} tone={a.toGo <= 0 ? "good" : undefined}
                hint={a.etaWeeks ? `about ${Math.ceil(a.etaWeeks)} weeks at this pace` : `goal ${a.goal} kg`} />
            ) : <Stat label="Lowest" value={`${a.lowest.kg} kg`} hint={prettyDate(a.lowest.date)} />}
          </div>
          {a.goal > 0 && a.start.kg > a.goal && (
            <div className="card p-4">
              <div className="flex justify-between text-sm mb-2"><span>{a.start.kg} kg</span><span className="font-medium">{Math.round(Math.max(0, Math.min(1, (a.start.kg - a.current.kg) / (a.start.kg - a.goal))) * 100)}% of the way</span><span>{a.goal} kg 🎯</span></div>
              <ProgressBar value={(a.start.kg - a.current.kg) / (a.start.kg - a.goal)} tone="good" />
            </div>
          )}
          <Hype text={hype[1]} i={1} />
          <Section title="Weight over time">
            <WeightChart data={a.chart} />
            {a.bmi && <p className="text-xs muted mt-2">BMI {a.bmi.toFixed(1)}. Just a rough guide; how you feel matters more.</p>}
          </Section>
        </>
      ) : <Section title="Weight"><Empty>No weigh-ins yet. Log your first one with the button above!</Empty></Section>}

      <Hype text={hype[2]} i={2} />

      <Section title="📏 Body measurements" action={<MeasureForm last={m ? Object.fromEntries(MEASURES.map((k) => [k, m.latest[k]])) : undefined} />}>
        {"error" in ms && ms.error && <p className="text-sm text-bad mb-3">{ms.error.includes("misnamed") ? "Add a “Measurements” tab to your Life sheet (Date, Chest, Waist, Belly, Hip, Arms, Thigh, Notes)." : ms.error}</p>}
        {m ? (
          <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6 items-center">
            <BodyViews three={<Body3D entries={ms.entries} heightCm={config.heightCm} />} lines={<BodyOutline entries={ms.entries} />} />
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Total cm lost" value={`${m.totalLost} cm`} tone={m.totalLost > 0 ? "good" : undefined} hint={`over ${m.days} days, all 6 spots added up`} />
                <Stat label="Biggest win" value={m.change[m.best] < 0 ? MEASURE_LABEL[m.best] : "–"} tone={m.change[m.best] < 0 ? "good" : undefined} hint={m.change[m.best] < 0 ? `down ${Math.round(-m.change[m.best] * 10) / 10} cm` : "add another check-in"} />
              </div>
              <table className="w-full text-sm">
                <thead><tr className="text-xs muted text-left"><th className="font-normal py-1">cm</th><th className="font-normal text-right">Day 1</th>{m.prev && <th className="font-normal text-right">Last time</th>}<th className="font-normal text-right">Now</th><th className="font-normal text-right">Change</th></tr></thead>
                <tbody>
                  {MEASURES.map((k) => (
                    <tr key={k} className="border-t border-[var(--border)]">
                      <td className="py-1.5">{MEASURE_LABEL[k]}</td><td className="text-right tabular muted">{m.first[k]}</td>{m.prev && <td className="text-right tabular muted">{m.prev[k]}</td>}
                      <td className="text-right tabular font-medium">{m.latest[k]}</td>
                      <td className={`text-right tabular ${m.change[k] < 0 ? "text-good" : m.change[k] > 0 ? "text-warn" : "muted"}`}>{m.change[k] > 0 ? "+" : ""}{m.change[k]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {m.daysSinceLast > 21 && <p className="text-xs text-warn">Last measured {m.daysSinceLast} days ago. Time for a new check-in, the outline is waiting! 📏</p>}
            </div>
          </div>
        ) : <Empty>Add your first measurements and I&apos;ll draw your outline. Every new check-in draws a new one inside it.</Empty>}
      </Section>

      <Hype text={hype[3]} i={3} />

      <Section title="🍳 Recipes for your kitchen" action={<a href={`/weight?shuffle=${Date.now() % 100000}`} className="text-xs text-accent">🔀 Shuffle</a>}>
        <p className="text-sm muted mb-3">Real recipes from TheMealDB that only need a gas cooker, rice cooker, sandwich maker or air fryer. New picks every week.</p>
        <form className="flex flex-wrap gap-2 mb-4">
          <input name="q" defaultValue={q} placeholder="Search recipes (e.g. chicken, rice, egg)" className="input flex-1 min-w-48" />
          <button className="btn">Search</button>
        </form>
        <div className="flex flex-wrap gap-2 mb-4">
          <a href={q ? `/weight?q=${encodeURIComponent(q)}` : "/weight"} className={`chip ${!use ? "soft" : "muted"}`}>All</a>
          {APPLIANCES.map((ap) => <a key={ap} href={`/weight?use=${encodeURIComponent(ap)}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={`chip ${use === ap ? "soft" : "muted"}`}>{APPLIANCE_ICON[ap]} {ap}</a>)}
        </div>
        {recipeError && <p className="text-sm text-bad">Couldn&apos;t load recipes: {recipeError.slice(0, 200)}</p>}
        {!recipeError && !recipes.length && <Empty>No matching recipes{q ? ` for “${q}”` : ""}. Try another search or shuffle.</Empty>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((r) => (
            <article key={r.id} className="rounded-xl overflow-hidden border flex flex-col">
              <SafeImg src={r.image} alt={r.name} emoji="🍲" className="w-full h-44" />
              <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="text-xs muted">{r.area} · {r.category}</div>
                <h3 className="font-semibold leading-snug">{r.name}</h3>
                <div className="flex flex-wrap gap-1">{r.appliances.map((ap) => <span key={ap} className="chip soft">{APPLIANCE_ICON[ap]} {ap}</span>)}</div>
                {r.tip && <p className="text-xs muted">💡 {r.tip}</p>}
                <details className="text-xs muted"><summary className="cursor-pointer">Ingredients ({r.ingredients.length})</summary><ul className="mt-1 list-disc pl-4">{r.ingredients.map((i) => <li key={i}>{i}</li>)}</ul></details>
                <div className="flex gap-3 text-sm mt-auto pt-2">
                  <a href={r.source} target="_blank" rel="noreferrer" className="text-accent font-medium">View recipe ↗</a>
                  {r.youtube && <a href={r.youtube} target="_blank" rel="noreferrer" className="muted">▶ Video</a>}
                </div>
                <MadeItButton recipe={r.name} link={r.source} made={madeNames.has(r.name.toLowerCase())} />
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Hype text={hype[4]} i={4} />

      <Section title="📒 My cooking log">
        {log.log.length ? (
          <ul className="space-y-3">
            {log.log.slice(0, 20).map((l, i) => (
              <li key={i} className="text-sm">
                <div className="flex justify-between gap-2"><span className="font-medium">{l.link ? <a href={l.link} target="_blank" rel="noreferrer" className="hover:underline">{l.recipe}</a> : l.recipe}</span><span className="muted text-xs shrink-0">{l.date && prettyDate(l.date)}</span></div>
                {l.rating > 0 && <div className="text-xs">{"⭐".repeat(Math.round(l.rating))}</div>}
                {l.comment && <p className="muted">“{l.comment}”</p>}
              </li>
            ))}
          </ul>
        ) : <Empty>Tick “I made this” on a recipe to start your log.</Empty>}
      </Section>
    </div>
  );
}
