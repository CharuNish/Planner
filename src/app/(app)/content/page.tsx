import { Dancing_Script } from "next/font/google";
import { ContentTrends } from "@/components/content-charts";
import { FollowersForm } from "@/components/content-forms";
import { CountUp } from "@/components/fx";
import { config } from "@/lib/config";
import { prettyDate, daysBetween, todayISO } from "@/lib/dates";
import { ACCOUNTS, analyseContent, CHANNELS, loadContent, NUDGE_DAYS, PLATFORM_COLOR, PLATFORM_ICON, PLATFORMS } from "@/lib/content";

export const dynamic = "force-dynamic";

const script = Dancing_Script({ subsets: ["latin"], weight: ["600", "700"] });
const k = (n: number) => (n >= 10000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : n.toLocaleString("en-US"));
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${k(Math.abs(n))}`;
const money = (n: number) => `${config.currency} ${Math.round(n).toLocaleString("en-US")}`;

function Card({ title, sub, action, children, className = "" }: { title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card p-5 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div><h2 className="font-semibold">{title}</h2>{sub && <p className="text-xs muted mt-0.5">{sub}</p>}</div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="card p-4 relative overflow-hidden">
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-50" style={{ background: "radial-gradient(#f9a8d4, transparent 70%)" }} />
      <div className="kicker">{label}</div>
      <div className="text-2xl font-semibold mt-1.5 tabular" style={{ fontFamily: "var(--font-display)" }}>{value}</div>
      {hint && <div className="text-xs muted mt-1">{hint}</div>}
    </div>
  );
}

function DaysBubble({ days, label }: { days: number | null; label: string }) {
  const late = days !== null && days >= NUDGE_DAYS;
  const ring = days === null ? "rgba(244,114,182,.25)" : late ? "var(--warn)" : days <= 3 ? "var(--good)" : "#f472b6";
  return (
    <div className="flex flex-col items-center text-center gap-1.5">
      <div className="w-16 h-16 rounded-full grid place-items-center tabular" style={{ border: `3px solid ${ring}`, boxShadow: `0 0 18px color-mix(in srgb, ${ring} 45%, transparent)`, background: "rgba(255,255,255,.03)" }}>
        <span className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>{days ?? "–"}</span>
      </div>
      <div className="text-xs leading-tight">{label}</div>
      <div className={`text-[11px] ${late ? "text-warn" : "muted"}`}>{days === null ? "no posts yet" : days === 0 ? "posted today ✨" : `${days === 1 ? "day" : "days"} ago${late ? " 🥺" : ""}`}</div>
    </div>
  );
}

export default async function ContentPage() {
  const data = await loadContent();
  const a = analyseContent(data.followers, data.uploads, data.collabs);
  const today = todayISO();
  const sheetUrl = config.google.contentSheetId ? `https://docs.google.com/spreadsheets/d/${config.google.contentSheetId}/edit` : "";
  const totalFollowers = a.totals.reduce((s, t) => s + t.followers, 0);
  const gained = a.totals.reduce((s, t) => s + t.change30, 0);
  const likesDiff = a.likesThisMonth - a.likesLastMonth;
  const maxTypeLikes = Math.max(1, ...a.byType.map((t) => t.avgLikes));

  return (
    <div className="girly space-y-5">
      <div className="girly-bg" aria-hidden />

      <header className="flex flex-wrap items-end justify-between gap-3 mb-2">
        <div>
          <div className="kicker mb-1">🎀 your little content studio</div>
          <h1 className={`${script.className} girly-title`}>Content Studio</h1>
          <p className="muted text-sm mt-1 max-w-2xl">How your 7 accounts are growing, straight from your sheet. You update the numbers there; I make them pretty here. 💕</p>
        </div>
        {sheetUrl && <a href={sheetUrl} target="_blank" rel="noreferrer" className="pill-btn on">📝 Open my sheet</a>}
      </header>

      {data.demo && <div className="rounded-2xl px-4 py-3 text-sm soft">👀 You&apos;re seeing <b>sample data</b>. Connect your Life sheet (LIFE_SHEET_ID) to see your real numbers.</div>}

      {a.nudges.length > 0 && (
        <div className="nudge rounded-2xl px-4 py-3 text-sm space-y-1">
          <div className="font-semibold">💌 A little nudge</div>
          {CHANNELS.map((c) => {
            const n = a.nudges.filter((x) => x.channel === c);
            if (!n.length) return null;
            const worst = Math.max(...n.map((x) => x.daysSince ?? 0));
            return <p key={c}><b>{c}</b>: {n.length === a.accounts.filter((x) => x.channel === c).length ? `no post for ${worst} days on any platform.` : `${n.map((x) => `${x.platform}${x.daysSince === null ? " (never)" : ` (${x.daysSince} days)`}`).join(", ")} ${n.length > 1 ? "are" : "is"} waiting for you.`} Time for a cute little post? 🌸</p>;
          })}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="💖 Followers" value={<CountUp value={totalFollowers} />} hint={a.totals.map((t) => `${t.channel} ${k(t.followers)}`).join(" · ")} />
        <Stat label="🌱 Gained (30 days)" value={signed(gained)} hint={a.totals.map((t) => `${t.channel} ${signed(t.change30)}`).join(" · ")} />
        <Stat label="💗 Likes this month" value={<CountUp value={a.likesThisMonth} />} hint={`${signed(likesDiff)} vs last month`} />
        <Stat label="🎀 Posts this month" value={<CountUp value={a.postsThisMonth} />} hint={a.earned || a.pending ? `${money(a.earned)} earned from collabs` : "keep going, you're doing great"} />
      </div>

      <Card title="🌸 Followers on each account" sub="Latest number from your Followers tab, and the change since the check before" action={<FollowersForm accounts={a.accounts.map((x) => ({ channel: x.channel, platform: x.platform, followers: x.followers }))} />}>
        <div className="grid md:grid-cols-2 gap-4">
          {CHANNELS.map((c) => (
            <div key={c} className="rounded-2xl p-4" data-tile="">
              <div className="flex items-baseline justify-between mb-3"><h3 className="font-semibold">{c}</h3><span className="text-sm muted tabular">{k(a.totals.find((t) => t.channel === c)?.followers || 0)} total</span></div>
              <div className="grid grid-cols-2 gap-2">
                {a.accounts.filter((x) => x.channel === c).map((x) => (
                  <div key={x.platform} className="rounded-xl px-3 py-2.5" style={{ background: `color-mix(in srgb, ${PLATFORM_COLOR[x.platform]} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${PLATFORM_COLOR[x.platform]} 30%, transparent)` }}>
                    <div className="text-xs muted">{PLATFORM_ICON[x.platform]} {x.platform}</div>
                    <div className="text-xl font-semibold tabular" style={{ fontFamily: "var(--font-display)" }}>{x.followers === null ? "–" : k(x.followers)}</div>
                    <div className="text-[11px] muted">{x.followers === null ? "not logged yet" : <><span className={x.change > 0 ? "text-good" : x.change < 0 ? "text-bad" : ""}>{signed(x.change)}</span> · {prettyDate(x.checked!, { day: "numeric", month: "short" })}</>}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="⏳ Days since your last post" sub={`From your Uploads tab. I nudge you here and on Telegram once it passes ${NUDGE_DAYS} days.`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {CHANNELS.map((c) => (
            <div key={c}>
              <div className="text-sm font-medium mb-3">{c}</div>
              <div className="flex flex-wrap gap-4">
                {a.accounts.filter((x) => x.channel === c).map((x) => <DaysBubble key={x.platform} days={x.daysSince} label={`${PLATFORM_ICON[x.platform]} ${x.platform}`} />)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <ContentTrends followers={a.followerTrend} likes={a.likesTrend} accounts={ACCOUNTS} channels={[...CHANNELS]} colors={PLATFORM_COLOR} />

      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="👑 Your most loved posts" sub="Top 5 by total likes across platforms">
          {!a.top.length ? <p className="text-sm muted">Add likes to your Uploads tab and your stars will show up here ⭐</p> : (
            <ol className="space-y-2.5">
              {a.top.map((u, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full grid place-items-center text-xs font-semibold shrink-0" style={{ background: "linear-gradient(135deg,#f472b6,#c084fc)", color: "#fff" }}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{u.link ? <a href={u.link} target="_blank" rel="noreferrer" className="hover:underline">{u.title}</a> : u.title}</div>
                    <div className="text-xs muted">{u.channel} · {u.type} · {prettyDate(u.date, { day: "numeric", month: "short" })}</div>
                  </div>
                  <span className="tabular text-sm">💗 {k(u.totalLikes)}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card title="✨ What gets the most love" sub="Average likes per upload, by type">
          {!a.byType.length ? <p className="text-sm muted">Once you&apos;ve logged a few uploads with likes, I&apos;ll show which kind of post does best.</p> : (
            <div className="space-y-2.5">
              {a.byType.map((t) => (
                <div key={t.type} className="grid grid-cols-[6.5rem_1fr_4.5rem] items-center gap-2 text-sm">
                  <span>{t.type}</span>
                  <div className="bar"><span style={{ width: `${(t.avgLikes / maxTypeLikes) * 100}%`, background: "linear-gradient(90deg,#f9a8d4,#c084fc)", color: "#f472b6" }} /></div>
                  <span className="tabular text-right text-xs muted">{k(t.avgLikes)} avg</span>
                </div>
              ))}
              <div className="text-xs muted pt-2 grid grid-cols-2 gap-1">
                {a.accounts.filter((x) => x.posts).map((x) => <span key={x.channel + x.platform}>{PLATFORM_ICON[x.platform]} {x.channel} {x.platform}: {k(x.avgLikes)} avg</span>)}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card title="🤝 Collabs" sub="From your Collabs tab">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl p-3" data-tile=""><div className="kicker">Earned</div><div className="text-lg font-semibold tabular">{money(a.earned)}</div></div>
          <div className="rounded-xl p-3" data-tile=""><div className="kicker">Waiting to be paid</div><div className="text-lg font-semibold tabular">{money(a.pending)}</div></div>
          <div className="rounded-xl p-3 col-span-2 md:col-span-1" data-tile=""><div className="kicker">Open collabs</div><div className="text-lg font-semibold tabular">{a.openCollabs.length}</div></div>
        </div>
        {a.dueSoon.length > 0 && <p className="text-sm text-warn mb-3">⏰ Due soon: {a.dueSoon.map((c) => `${c.brand} (${daysBetween(today, c.due) < 0 ? "overdue" : daysBetween(today, c.due) === 0 ? "today" : `in ${daysBetween(today, c.due)} days`})`).join(", ")}</p>}
        {!data.collabs.length ? <p className="text-sm muted">No collabs yet. When a brand reaches out, add a row to the Collabs tab 💼</p> : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm min-w-[620px]">
              <thead><tr className="text-left text-xs muted"><th className="py-2 px-1 font-normal">Brand</th><th className="font-normal">Idea</th><th className="font-normal">Channel</th><th className="font-normal">Status</th><th className="font-normal">Due</th><th className="font-normal text-right">Price</th></tr></thead>
              <tbody>
                {[...data.collabs].sort((x, y) => Number(x.paid) - Number(y.paid) || (x.due || "9").localeCompare(y.due || "9")).map((c, i) => (
                  <tr key={i} className="border-t border-[var(--border)] align-top">
                    <td className="py-2 px-1 font-medium">{c.brand}</td>
                    <td className="py-2 pr-2">{c.idea}</td>
                    <td className="py-2 pr-2 muted">{c.channel}{c.platforms ? ` · ${c.platforms}` : ""}</td>
                    <td className="py-2 pr-2"><span className={`chip ${c.paid || c.status === "Paid" ? "paid" : "soft"}`}>{c.paid || c.status === "Paid" ? "Paid 💸" : c.status}</span></td>
                    <td className="py-2 pr-2 muted whitespace-nowrap">{c.due ? prettyDate(c.due, { day: "numeric", month: "short" }) : "–"}</td>
                    <td className="py-2 text-right tabular">{c.price ? money(c.price) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="🗓️ Recent uploads" sub="Likes per platform, from your Uploads tab">
        {!a.recent.length ? <p className="text-sm muted">Nothing logged yet. Add a row to the Uploads tab each time you post, and the likes as they come in 💕</p> : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm min-w-[620px]">
              <thead><tr className="text-left text-xs muted"><th className="py-2 px-1 font-normal">Date</th><th className="font-normal">Upload</th>{PLATFORMS.map((p) => <th key={p} className="font-normal text-right">{PLATFORM_ICON[p]} {p}</th>)}<th className="font-normal text-right">Total</th></tr></thead>
              <tbody>
                {a.recent.map((u, i) => (
                  <tr key={i} className="border-t border-[var(--border)]">
                    <td className="py-2 px-1 muted whitespace-nowrap">{prettyDate(u.date, { day: "numeric", month: "short" })}</td>
                    <td className="py-2 pr-2"><div className="font-medium">{u.title}</div><div className="text-xs muted">{u.channel} · {u.type}</div></td>
                    {PLATFORMS.map((p) => <td key={p} className="py-2 text-right tabular">{u.platforms.includes(p) ? (u.likes[p] ? k(u.likes[p]!) : <span className="muted">·</span>) : ""}</td>)}
                    <td className="py-2 text-right tabular font-medium">{k(u.totalLikes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
