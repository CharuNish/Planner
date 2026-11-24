import { Dancing_Script } from "next/font/google";
import { DemoBanner, Empty, PageHeader, Section, Stat } from "@/components/ui";
import { WinWall } from "@/components/win-wall";
import { WinForm } from "@/components/wins";
import { todayISO } from "@/lib/dates";
import { dailyShuffle } from "@/lib/hype";
import { analyseWins, isWin, loadWinsOrdered, winIcon } from "@/lib/life";

export const dynamic = "force-dynamic";

// Handwritten captions under each polaroid.
const hand = Dancing_Script({ subsets: ["latin"], weight: ["500", "600"] });

function cheer(a: ReturnType<typeof analyseWins>, winsWeek: number) {
  return [
    a.today ? `${a.today} memor${a.today > 1 ? "ies" : "y"} saved today already. Main character energy 🎬` : "Nothing saved today yet. Even 'coffee was perfect' counts, babe ☕",
    winsWeek ? `${winsWeek} wins this week. You're literally a highlight reel ✨` : "Fresh week, fresh memories. Let's fill this wall 💅",
    a.streak >= 2 ? `${a.streak} days in a row of memories 🔥 Future you is going to cry (the good kind).` : "Bad days go on the wall too. They're part of your story 🌧️➡️🌈",
  ];
}

export default async function MemoriesPage() {
  const today = todayISO();
  const { demo, items } = await loadWinsOrdered();
  const a = analyseWins(items, today);
  const winsWeek = items.filter((w) => isWin(w) && w.date <= today && w.date > new Date(Date.parse(today) - 7 * 864e5).toISOString().slice(0, 10)).length;

  return (
    <div className="space-y-6 rise">
      <PageHeader title="📸 Memories" subtitle="The good days, the hard days, the tiny moments. Your morning Telegram message brags about yesterday's wins." />
      {demo && <DemoBanner what="Life sheet" />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="This week" value={a.week} hint="memories in the last 7 days" tone={a.week ? "good" : undefined} />
        <Stat label="This month" value={a.month} hint={`${a.total} all time`} />
        <Stat label="Streak" value={`${a.streak} 🔥`} hint="days in a row with a memory" />
        <Stat label="Photos" value={a.photos} hint="polaroids on your wall 📸" />
      </div>

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-5">
        <Section title="✨ Save a memory">
          <WinForm />
        </Section>
        <Section title="💖 Bestie says">
          <ul className="space-y-3">
            {dailyShuffle(cheer(a, winsWeek), today).map((l, i) => <li key={i} className="text-lg" style={{ fontFamily: "var(--font-display)", transform: `rotate(${i % 2 ? 1 : -1}deg)` }}>{l}</li>)}
          </ul>
          {a.byCat.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-5">{a.byCat.map((c) => <span key={c.key} className="chip soft text-xs">{c.icon} {c.key} · {c.n}</span>)}</div>
          )}
        </Section>
      </div>

      {!items.length ? (
        <Empty>No memories yet. Save your first one above 👆 (a sunset, a 10k walk, a hard day you got through, it all counts!)</Empty>
      ) : (
        <WinWall demo={demo} handFont={hand.className} items={items.map((w) => ({ key: w.key, date: w.date, text: w.text, category: w.category, photo: w.photo, icon: winIcon(w.category) }))} />
      )}
    </div>
  );
}
