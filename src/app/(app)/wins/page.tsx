import { SafeImg } from "@/components/img";
import { DemoBanner, Empty, PageHeader, Section, Stat } from "@/components/ui";
import { WinForm } from "@/components/wins";
import { prettyDate, todayISO } from "@/lib/dates";
import { dailyShuffle } from "@/lib/hype";
import { analyseWins, loadWins, winIcon, type Win } from "@/lib/life";

export const dynamic = "force-dynamic";

function cheer(a: ReturnType<typeof analyseWins>, today: string) {
  const lines = [
    a.today ? `${a.today} win${a.today > 1 ? "s" : ""} already today?? Who let you be this iconic 😮‍💨` : "No win logged today yet. Even 'drank water' counts, babe 💧",
    a.week ? `${a.week} wins this week. You're literally a highlight reel 🎬` : "Fresh week, fresh wins. Let's fill this page 💅",
    a.streak >= 2 ? `${a.streak}-day win streak 🔥 Don't you dare stop now.` : "Start a streak: one tiny win a day 🌱",
  ];
  return dailyShuffle(lines, today);
}

export default async function WinsPage() {
  const today = todayISO();
  const { demo, items } = await loadWins();
  const a = analyseWins(items, today);
  const byDay = new Map<string, Win[]>();
  for (const w of items) byDay.set(w.date, [...(byDay.get(w.date) || []), w]);

  return (
    <div className="space-y-6 rise">
      <PageHeader title="🏆 Wins" subtitle="Every special thing you did, big or tiny. Your morning Telegram message brags about yesterday's wins." />
      {demo && <DemoBanner what="Life sheet" />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="This week" value={a.week} hint="wins in the last 7 days" tone={a.week ? "good" : undefined} />
        <Stat label="This month" value={a.month} hint={`${a.total} all time`} />
        <Stat label="Win streak" value={`${a.streak} 🔥`} hint="days in a row with a win" />
        <Stat label="Photos" value={a.photos} hint="memories saved 📸" />
      </div>

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-5">
        <Section title="✨ Log a win">
          <WinForm />
        </Section>
        <Section title="💖 Bestie says">
          <ul className="space-y-3">
            {cheer(a, today).map((l, i) => <li key={i} className="text-lg" style={{ fontFamily: "var(--font-display)", transform: `rotate(${i % 2 ? 1 : -1}deg)` }}>{l}</li>)}
          </ul>
          {a.byCat.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-5">{a.byCat.map((c) => <span key={c.key} className="chip soft text-xs">{c.icon} {c.key} · {c.n}</span>)}</div>
          )}
        </Section>
      </div>

      {!items.length && <Empty>No wins yet. Log your first one above 👆 (walked 10k steps? did a headstand? volunteered? it counts!)</Empty>}
      <div className="space-y-5">
        {[...byDay.entries()].map(([date, ws]) => (
          <section key={date}>
            <div className="kicker mb-2">{date === today ? "Today" : prettyDate(date, { weekday: "long", day: "numeric", month: "short" })}</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ws.map((w) => (
                <article key={`${w.row}-${w.text}`} className="card overflow-hidden">
                  {w.photo && <a href={w.photo} target="_blank" rel="noreferrer"><SafeImg src={w.photo} alt={w.text} emoji={winIcon(w.category)} className="w-full h-48" /></a>}
                  <div className="p-4 flex gap-3">
                    <span className="text-2xl">{winIcon(w.category)}</span>
                    <div><p className="font-medium">{w.text}</p><p className="text-xs muted mt-1">{w.category}</p></div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
