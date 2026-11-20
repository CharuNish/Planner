import { Suspense } from "react";
import { SafeImg } from "@/components/img";
import { PageHeader, Section } from "@/components/ui";
import { prettyDate, todayISO } from "@/lib/dates";
import { settle } from "@/lib/fetchx";
import { hasGemini } from "@/lib/gemini";
import { getMedium, getPapers, getTrending, getVideos } from "@/lib/updates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Err = ({ msg }: { msg: string }) => <p className="text-sm text-bad">Couldn&apos;t load this right now: {msg.slice(0, 220)}</p>;
const Loading = ({ what }: { what: string }) => <p className="text-sm muted animate-pulse">Fetching {what}… (the first visit of the day takes a few seconds)</p>;

async function Repos() {
  const r = await settle(getTrending());
  if (!r.ok) return <Err msg={r.error} />;
  return (
    <ol className="grid md:grid-cols-2 gap-3">
      {r.data.map((x, i) => (
        <li key={x.name} className="rounded-xl p-4 flex gap-3" style={{ background: "var(--bg)" }}>
          <span className="text-lg font-semibold muted tabular w-6 shrink-0">{i + 1}</span>
          <div className="min-w-0">
            <a href={x.url} target="_blank" rel="noreferrer" className="font-medium hover:underline break-all">{x.name}</a>
            <p className="text-sm mt-1">{x.summary || x.description || "No description."}</p>
            <div className="text-xs muted mt-1.5 flex flex-wrap gap-x-3">{x.language && <span>{x.language}</span>}{x.stars > 0 && <span>★ {x.stars.toLocaleString()}</span>}{x.starsToday > 0 && <span className="text-good">+{x.starsToday.toLocaleString()} today</span>}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

async function Papers() {
  const r = await settle(getPapers());
  if (!r.ok) return <Err msg={r.error} />;
  return (
    <div className="space-y-4">
      {r.data.map((p) => (
        <article key={p.id} className="border-b pb-4 last:border-0 last:pb-0">
          <div className="flex flex-wrap gap-2 items-center text-xs mb-1">{p.topic && <span className="chip soft">{p.topic}</span>}<span className="muted">{p.published && prettyDate(p.published)}</span>{p.upvotes > 0 && <span className="muted">▲ {p.upvotes} upvotes</span>}</div>
          <a href={p.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">{p.title}</a>
          <p className="text-sm mt-1">{p.summary}</p>
          {p.why && <p className="text-xs muted mt-1">💡 {p.why}</p>}
          <div className="text-xs mt-1.5 flex gap-3"><a className="text-accent" href={p.url} target="_blank" rel="noreferrer">arXiv ↗</a><a className="muted" href={`https://arxiv.org/pdf/${p.id}`} target="_blank" rel="noreferrer">PDF</a></div>
        </article>
      ))}
    </div>
  );
}

async function Medium() {
  const r = await settle(getMedium());
  if (!r.ok) return <Err msg={r.error} />;
  return (
    <div className="space-y-3">
      {r.data.map((a) => (
        <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="flex gap-3 group">
          <SafeImg src={a.image} alt="" emoji="📝" className="w-20 h-16 rounded-lg shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-medium group-hover:underline line-clamp-2">{a.title}</div>
            <div className="text-xs muted">{a.author} · #{a.tag}</div>
            {a.why && <div className="text-xs muted mt-0.5 line-clamp-2">{a.why}</div>}
          </div>
        </a>
      ))}
    </div>
  );
}

async function Videos() {
  const r = await settle(getVideos());
  if (!r.ok) return <Err msg={r.error} />;
  return (
    <div className="grid sm:grid-cols-3 gap-4">
      {r.data.map((v) => (
        <a key={v.id} href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noreferrer" className="group">
          <div className="relative"><SafeImg src={v.thumbnail} alt="" emoji="▶️" className="w-full aspect-video rounded-xl" /><span className="absolute inset-0 grid place-items-center text-4xl opacity-0 group-hover:opacity-100 transition">▶️</span></div>
          <div className="text-sm font-medium mt-2 group-hover:underline line-clamp-2">{v.title}</div>
          <div className="text-xs muted">{v.channel} · {v.views.toLocaleString()} views</div>
          {v.why && <div className="text-xs muted mt-0.5">{v.why}</div>}
        </a>
      ))}
    </div>
  );
}

export default function UpdatesPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="📰 Updates" subtitle={`Fresh picks for ${prettyDate(todayISO(), { weekday: "long", day: "numeric", month: "long" })}. Refreshed every morning.`} />
      {!hasGemini() && <div className="rounded-xl px-4 py-3 text-sm soft">✨ Add a free <b>GEMINI_API_KEY</b> to get plain-English summaries and smarter picks (see SETUP.md).</div>}
      <Section title="🔥 Trending on GitHub today"><Suspense fallback={<Loading what="trending repos" />}><Repos /></Suspense></Section>
      <div className="grid lg:grid-cols-5 gap-5">
        <Section title="📄 New papers for you" className="lg:col-span-3"><Suspense fallback={<Loading what="papers" />}><Papers /></Suspense></Section>
        <Section title="📝 Medium reads" className="lg:col-span-2"><Suspense fallback={<Loading what="Medium articles" />}><Medium /></Suspense></Section>
      </div>
      <Section title="🎬 Worth watching"><Suspense fallback={<Loading what="videos" />}><Videos /></Suspense></Section>
    </div>
  );
}
