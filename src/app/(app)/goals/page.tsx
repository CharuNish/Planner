import { TravelGlobe } from "@/components/globe";
import { SafeImg } from "@/components/img";
import { placeIn } from "@/lib/places";
import { DemoBanner, Empty, PageHeader, ProgressBar } from "@/components/ui";
import { config } from "@/lib/config";
import { daysBetween, prettyDate, todayISO } from "@/lib/dates";
import { imageFor } from "@/lib/images";
import { loadGoals } from "@/lib/life";
import { Celebration } from "@/components/celebrate";
import { goalWins } from "@/lib/celebrations";

export const dynamic = "force-dynamic";

const CAT: Record<string, { icon: string; title: string }> = {
  career: { icon: "💼", title: "Career" }, buy: { icon: "🛍️", title: "Things to buy" }, travel: { icon: "✈️", title: "Places to visit" },
  learn: { icon: "📖", title: "Things to learn" }, health: { icon: "💪", title: "Health" }, other: { icon: "✨", title: "Other" },
};

export default async function GoalsPage() {
  const { demo, goals } = await loadGoals();
  const today = todayISO();
  const withImages = await Promise.all(goals.map(async (g) => ({ ...g, image: g.image || (await imageFor(g.goal)) })));
  const groups = new Map<string, typeof withImages>();
  for (const g of withImages) { const k = CAT[g.category.toLowerCase()] ? g.category.toLowerCase() : "other"; groups.set(k, [...(groups.get(k) || []), g]); }
  const done = goals.filter((g) => /done|achiev|complete/i.test(g.status)).length;
  const travel = goals.map((g) => ({ g, place: placeIn(`${g.goal} ${g.notes}`) })).filter((x) => x.place && x.g.category.toLowerCase() === "travel") as { g: (typeof goals)[number]; place: NonNullable<ReturnType<typeof placeIn>> }[];

  return (
    <div className="space-y-6 rise">
      <PageHeader title="🎯 Mini goals" subtitle={`${goals.length} goals · ${done} achieved 🏆`} />
      {demo && <DemoBanner what="Life sheet" />}
      <Celebration kind="balloons" title="Mini goal achieved! 🎈" items={goalWins(goals)} />
      {!goals.length && <Empty>Add goals to the Goals tab of your Life sheet.</Empty>}
      {travel.length > 0 && (
        <section className="card p-5 md:p-6 grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6 items-center overflow-hidden">
          <div className="max-w-[440px] w-full mx-auto"><TravelGlobe markers={travel.map((t) => ({ coords: t.place.coords, label: t.g.goal }))} /></div>
          <div>
            <div className="kicker">travel map</div>
            <h2 className="text-xl font-semibold mt-1">✈️ {travel.length} place{travel.length === 1 ? "" : "s"} on your list</h2>
            <ul className="mt-4 space-y-2">
              {travel.map(({ g, place }) => (
                <li key={g.goal} className="flex items-center gap-3 text-sm">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#22d3ee", boxShadow: "0 0 8px #22d3ee" }} />
                  <span className="flex-1">{g.goal}</span>
                  <span className="muted text-xs capitalize">{place.name}{/done|achiev|complete/i.test(g.status) ? " · visited 🏆" : ""}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs muted mt-4">Drag the globe to spin it. A place shows up when its name is in the goal (e.g. “Visit Japan”).</p>
          </div>
        </section>
      )}
      {[...groups.entries()].map(([k, gs]) => (
        <section key={k}>
          <h2 className="font-semibold mb-3">{CAT[k].icon} {CAT[k].title}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {gs.map((g) => {
              const achieved = /done|achiev|complete/i.test(g.status);
              const days = g.targetDate ? daysBetween(today, g.targetDate) : null;
              return (
                <article key={g.goal} className={`card overflow-hidden flex flex-col ${achieved ? "ring-2 ring-[var(--good)]" : ""}`}>
                  <div className="relative">
                    <SafeImg src={g.image} alt={g.goal} emoji={CAT[k].icon} className="w-full h-28 md:h-36" />
                    <span className="absolute top-2 left-2 chip" style={{ background: "rgba(0,0,0,.55)", color: "white" }}>{achieved ? "🏆 Done" : g.status}</span>
                  </div>
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <h3 className="font-medium leading-snug">{g.goal}</h3>
                    {g.notes && <p className="text-xs muted">{g.notes}</p>}
                    <div className="mt-auto space-y-1.5">
                      {g.progress > 0 && <><ProgressBar value={g.progress / 100} tone={achieved ? "good" : "accent"} /><div className="text-xs muted">{g.progress}%</div></>}
                      <div className="flex justify-between text-xs muted">
                        <span>{g.cost ? `${config.currency} ${g.cost.toLocaleString()}` : ""}</span>
                        <span>{g.targetDate ? `${prettyDate(g.targetDate, { month: "short", year: "numeric" })}${days !== null && days >= 0 && !achieved ? ` · ${days}d` : ""}` : ""}</span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
      <p className="text-xs muted">Photos without an Image URL come from Openverse (openly licensed). Paste your own image link in the sheet to change one.</p>
    </div>
  );
}
