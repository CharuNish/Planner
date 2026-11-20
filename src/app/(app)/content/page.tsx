import { Suspense } from "react";
import { FollowerGrowthChart, PostsPerWeekChart } from "@/components/charts";
import { CaptionMaker, FollowersForm, PostedButton, StatsForm } from "@/components/content-forms";
import { SafeImg } from "@/components/img";
import { FeedError } from "@/components/retry";
import { DemoBanner, Empty, PageHeader, Section, Stat } from "@/components/ui";
import { CountUp } from "@/components/fx";
import { prettyDate } from "@/lib/dates";
import { settle } from "@/lib/fetchx";
import { analyseContent, buildQueue, engagement, getTrends, getYouTubeChannels, lastPosted, loadContentSheet, loadQueueFiles, PLATFORM_COLOR, PLATFORM_ICON, type QueueItem } from "@/lib/content";
import { getIdeas } from "@/lib/content-ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const k = (n: number) => (n >= 10000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : n.toLocaleString());
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function Bars({ rows, label }: { rows: { key: string; avgViews: number; posts: number }[]; label: string }) {
  if (!rows.length) return null;
  const max = Math.max(...rows.map((r) => r.avgViews));
  return (
    <div>
      <div className="kicker mb-2">{label}</div>
      <div className="space-y-1.5">
        {rows.slice(0, 6).map((r) => (
          <div key={r.key} className="grid grid-cols-[7rem_1fr_4rem] items-center gap-2 text-sm">
            <span className="truncate" title={r.key}>{r.key}</span>
            <div className="bar"><span style={{ width: `${(r.avgViews / max) * 100}%`, background: PLATFORM_COLOR[r.key] || "linear-gradient(90deg,#8b5cf6,#22d3ee)" }} /></div>
            <span className="tabular text-right text-xs muted">{k(r.avgViews)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Thumb({ item }: { item: QueueItem }) {
  return <SafeImg src={item.hasThumb ? `/api/thumb/${item.fileId}` : ""} alt={item.name} emoji={item.mimeType.startsWith("image") ? "🖼️" : "🎬"} className="w-20 h-28 rounded-lg shrink-0" />;
}

async function Ideas() {
  const r = await settle(getIdeas());
  if (!r.ok) return <FeedError msg={r.error} retryKey="content-ideas" />;
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {r.data.map((i, n) => (
        <article key={n} className="rounded-xl p-4" data-tile="">
          <div className="text-xs muted flex flex-wrap gap-2"><span className="chip soft">{i.channel}</span><span>{i.format}</span>{i.platforms && <span>· {i.platforms}</span>}</div>
          <h3 className="font-medium mt-1.5">{i.title}</h3>
          {i.hook && <p className="text-sm mt-1"><span className="muted">Hook:</span> {i.hook}</p>}
          {i.why && <p className="text-xs muted mt-1">💡 {i.why}</p>}
        </article>
      ))}
    </div>
  );
}

async function Trends() {
  const r = await settle(getTrends());
  if (!r.ok) return <FeedError msg={r.error} retryKey="content-trends" />;
  return (
    <div className="grid md:grid-cols-2 gap-x-6 gap-y-1.5">
      {(["Google", "YouTube"] as const).map((src) => {
        const items = r.data.filter((t) => t.source === src);
        if (!items.length) return null;
        return (
          <div key={src}>
            <div className="kicker mb-2">{src === "Google" ? "🔎 Searched in Sri Lanka" : "▶️ Trending on YouTube LK"}</div>
            <ol className="space-y-1.5 text-sm">
              {items.map((t, i) => <li key={i} className="flex gap-2"><span className="muted tabular w-5 shrink-0">{i + 1}.</span><a href={t.link} target="_blank" rel="noreferrer" className="hover:underline min-w-0"><span className="line-clamp-1">{t.title}</span>{t.traffic && <span className="text-xs muted block">{t.traffic}</span>}</a></li>)}
            </ol>
          </div>
        );
      })}
    </div>
  );
}

export default async function ContentPage() {
  const [q, sheet, yt] = await Promise.all([settle(loadQueueFiles()), loadContentSheet(), settle(getYouTubeChannels())]);
  const files = q.ok ? q.data : { demo: true, accounts: [], files: [] };
  const queue = buildQueue(files.files, sheet.posts);
  const a = analyseContent(sheet.posts, sheet.followers, yt.ok ? yt.data : []);
  const totalFollowers = a.totals.reduce((s, t) => s + t.followers, 0);
  const accountKeys = [...new Set([...files.accounts.map((x) => `${x.channel}|${x.platform}`), ...a.accounts.map((x) => `${x.channel}|${x.platform}`)])];
  const accountsForForm = accountKeys.map((key) => { const [channel, platform] = key.split("|"); return { channel, platform, followers: a.accounts.find((x) => x.channel === channel && x.platform === platform)?.followers }; });

  return (
    <div className="space-y-5">
      <PageHeader title="🎬 Content" subtitle="Your posting queue from Google Drive, captions written for you, and how your posts are doing. You upload; I remind you every morning." />
      {files.demo && <DemoBanner what="Content folder in Google Drive" />}
      {!q.ok && <p className="text-sm text-bad">Couldn't read your Content folder: {q.error}</p>}
      {!files.demo && sheet.demo && <p className="text-sm text-warn">Connect a sheet (CONTENT_SHEET_ID or LIFE_SHEET_ID) so I can remember what you've posted.</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="📥 Left to post" value={<CountUp value={queue.length} />} hint={`across ${new Set(queue.map((x) => x.channel + x.platform)).size} accounts`} tone={queue.length ? undefined : "good"} />
        <Stat label="✅ Posted this month" value={<CountUp value={a.postedThisMonth} />} hint={`${a.postedLast7} in the last 7 days`} tone={a.postedLast7 ? "good" : "warn"} />
        <Stat label="👀 Views (30 days)" value={k(a.totalViews30)} hint={`avg ${k(a.avgViews)} per post`} />
        <Stat label="👥 Followers" value={k(totalFollowers)} hint={a.totals.map((t) => `${t.channel} ${t.change30 >= 0 ? "+" : ""}${k(t.change30)}`).join(" · ") + " (30d)"} tone={a.totals.every((t) => t.change30 >= 0) ? "good" : undefined} />
      </div>

      <Section title="📥 Left to post" action={<span className="text-xs muted">Oldest first, per account</span>}>
        {!files.accounts.length ? (
          <Empty>No account folders found yet. In your Content folder, make sub-folders like <b>Life with C - Instagram</b> or <b>Ane Manda - TikTok</b> and drop your videos in.</Empty>
        ) : (
          <div className="space-y-6">
            {files.accounts.map((acc) => {
              const items = queue.filter((x) => x.channel === acc.channel && x.platform === acc.platform);
              const since = lastPosted(sheet.posts, acc.channel, acc.platform);
              return (
                <div key={acc.channel + acc.platform}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h3 className="font-semibold flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: PLATFORM_COLOR[acc.platform], boxShadow: `0 0 10px ${PLATFORM_COLOR[acc.platform]}` }} />{PLATFORM_ICON[acc.platform]} {acc.channel} · {acc.platform}</h3>
                    <span className={`text-xs ${since !== null && since > 7 ? "text-warn" : "muted"}`}>{items.length} left · {since === null ? "nothing posted yet" : since === 0 ? "posted today" : `last post ${since} day${since === 1 ? "" : "s"} ago`}</span>
                  </div>
                  {!items.length ? <Empty>All caught up here 🎉 Add more videos to the “{acc.folderName}” folder.</Empty> : (
                    <div className="space-y-3">
                      {items.map((item, i) => (
                        <details key={item.fileId} className="rounded-xl p-3" data-tile="" open={i === 0}>
                          <summary className="flex gap-3 items-center cursor-pointer list-none">
                            <Thumb item={item} />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs muted">{i === 0 ? <span className="chip soft mr-1">Up next</span> : `#${i + 1} · `}added {prettyDate(item.added, { day: "numeric", month: "short" })}{item.seconds ? ` · ${item.seconds}s` : ""}{sheet.captions.has(item.fileId) ? " · ✨ caption ready" : ""}</div>
                              <div className="font-medium truncate mt-0.5">{sheet.captions.get(item.fileId)?.title || item.name}</div>
                              <div className="text-xs muted truncate">{item.name}</div>
                              {item.link && <a href={item.link} target="_blank" rel="noreferrer" className="text-xs hover:underline">Open in Drive ↗</a>}
                            </div>
                          </summary>
                          <div className="mt-3 space-y-3">
                            <CaptionMaker item={item} saved={sheet.captions.get(item.fileId)} />
                            <PostedButton item={item} caption={sheet.captions.get(item.fileId)} />
                          </div>
                        </details>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="💡 Ideas for today" action={<span className="text-xs muted">New ideas every morning</span>}>
        <Suspense fallback={<p className="text-sm muted">Thinking up ideas…</p>}><Ideas /></Suspense>
      </Section>

      <Section title="📊 How your posts are doing">
        {a.tips.length > 0 && <ul className="space-y-1.5 text-sm mb-5">{a.tips.map((t, i) => <li key={i}>💡 {t}</li>)}</ul>}
        {a.needStats.length > 0 && <p className="text-sm text-warn mb-4">📝 {a.needStats.length} post{a.needStats.length > 1 ? "s need" : " needs"} views/likes added (tap “Add stats” below{yt.ok && yt.data.length ? "; YouTube fills in by itself" : ""}).</p>}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <Bars rows={a.byAccount} label="Avg views by account" />
          <Bars rows={a.byType} label="Avg views by type" />
          <Bars rows={a.byWeekday} label="Avg views by day posted" />
        </div>
        {a.byHashtag.length > 0 && (
          <div className="mb-6"><div className="kicker mb-2">Best hashtags</div><div className="flex flex-wrap gap-2">{a.byHashtag.map((h) => <span key={h.key} className="chip soft" title={`${h.posts} posts`}>{h.key} · {k(h.avgViews)}</span>)}</div></div>
        )}
        <div className="kicker mb-2">Recent posts</div>
        {!a.posted.length ? <Empty>Nothing posted yet. Tap “I posted this” on a queued video and it shows up here.</Empty> : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm min-w-[640px]">
              <thead><tr className="text-left text-xs muted"><th className="py-2 px-1 font-normal">Date</th><th className="font-normal">Post</th><th className="font-normal text-right">Views</th><th className="font-normal text-right">Likes</th><th className="font-normal text-right">Comments</th><th className="font-normal text-right">Engagement</th><th /></tr></thead>
              <tbody>
                {a.posted.slice(0, 12).map((p) => (
                  <tr key={p.row} className="border-t border-[var(--border)] align-top">
                    <td className="py-2 px-1 whitespace-nowrap muted">{prettyDate(p.date, { day: "numeric", month: "short" })}</td>
                    <td className="py-2 pr-2"><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: PLATFORM_COLOR[p.platform] }} />{p.link ? <a href={p.link} target="_blank" rel="noreferrer" className="hover:underline">{p.title || "(untitled)"}</a> : p.title || "(untitled)"}</div><div className="text-xs muted">{p.channel} · {p.platform} · {p.type}</div></td>
                    <td className="py-2 text-right tabular">{p.views ? k(p.views) : "–"}</td>
                    <td className="py-2 text-right tabular">{p.likes ? k(p.likes) : "–"}</td>
                    <td className="py-2 text-right tabular">{p.comments ? k(p.comments) : "–"}</td>
                    <td className="py-2 text-right tabular">{p.views ? pct(engagement(p)) : "–"}</td>
                    <td className="py-2 pl-2 text-right"><StatsForm post={p} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div className="grid lg:grid-cols-2 gap-5">
        <Section title="👥 Follower growth" action={<FollowersForm accounts={accountsForForm} />}>
          {a.growth.length > 1 ? <FollowerGrowthChart data={a.growth} channels={a.channelNames.filter((c) => a.totals.some((t) => t.channel === c))} /> : <Empty>Log your follower counts once a week to see growth here.</Empty>}
          {a.accounts.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-4">
              {a.accounts.map((x) => <div key={x.channel + x.platform} className="rounded-lg px-3 py-2 text-sm" data-tile=""><div className="text-xs muted">{PLATFORM_ICON[x.platform]} {x.channel} · {x.platform}{x.auto ? " · auto" : ""}</div><div className="font-semibold tabular">{k(x.followers)} <span className={`text-xs font-normal ${x.change30 >= 0 ? "text-good" : "text-bad"}`}>{x.change30 >= 0 ? "+" : ""}{k(x.change30)}</span></div></div>)}
            </div>
          )}
        </Section>
        <Section title="📆 Posting rhythm (8 weeks)">
          <PostsPerWeekChart data={a.weekly} channels={a.channelNames.filter((c) => a.posted.some((p) => p.channel === c))} />
        </Section>
      </div>

      <Section title="🔥 Trending in Sri Lanka today">
        <Suspense fallback={<p className="text-sm muted">Loading trends…</p>}><Trends /></Suspense>
      </Section>
    </div>
  );
}

