import { Suspense } from "react";
import { SaveOppButton } from "@/components/forms2";
import { Empty, PageHeader, Section } from "@/components/ui";
import { daysBetween, prettyDate, relativeDays, todayISO } from "@/lib/dates";
import { settle } from "@/lib/fetchx";
import { INTERESTS } from "@/lib/interests";
import { loadSavedOpps } from "@/lib/life";
import { getOpportunities, type Opportunity } from "@/lib/opportunities";

export const dynamic = "force-dynamic";

const li = (k: string) => `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(k)}&f_TPR=r604800&f_JT=F%2CC`;
const QUICK = [
  { label: "LinkedIn: Research Engineer (CV / XAI)", url: li('"research engineer" ("computer vision" OR "explainable AI")') },
  { label: "LinkedIn: AI Engineer", url: li('"AI engineer" ("computer vision" OR "explainable")') },
  { label: "LinkedIn: Research Assistant", url: li('"research assistant" ("computer vision" OR "neuroscience" OR "psychology" OR "explainable AI")') },
  { label: "LinkedIn: PhD positions", url: li('"PhD" ("computer vision" OR "explainable AI" OR "neuroscience")') },
  { label: "LinkedIn: MSc positions", url: li('("MSc" OR "master") scholarship ("computer vision" OR "AI" OR "neuroscience")') },
  { label: "NUS Careers", url: "https://careers.nus.edu.sg/" },
];
export const maxDuration = 60;

const TYPES: { key: Opportunity["type"] | "All"; label: string }[] = [
  { key: "All", label: "All" }, { key: "PhD", label: "🎓 PhD" }, { key: "MSc", label: "📘 MSc" }, { key: "School", label: "☀️ Summer/winter schools" }, { key: "Job", label: "💼 Jobs (RA / RE / AI Engineer)" },
];

async function Found({ type }: { type: string }) {
  const r = await settle(getOpportunities());
  if (!r.ok) return <p className="text-sm text-bad">{r.error.slice(0, 300)}</p>;
  const today = todayISO();
  const items = r.data.items.filter((o) => type === "All" || o.type === type);
  if (!items.length) return <Empty>Nothing in this category today. Check back tomorrow!</Empty>;
  return (
    <div className="space-y-3">
      {items.map((o, i) => {
        const days = o.deadline ? daysBetween(today, o.deadline) : null;
        return (
          <article key={i} className="rounded-xl p-4" style={{ background: "var(--bg)" }}>
            <div className="flex flex-wrap justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs muted flex flex-wrap gap-2"><span className="chip soft">{o.type}</span>{o.org && <span>{o.org}</span>}{o.country && <span>· {o.country}</span>}</div>
                <a href={o.url} target="_blank" rel="noreferrer" className="font-medium hover:underline block mt-1">{o.title}</a>
              </div>
              <div className="text-right text-sm shrink-0">
                {o.deadline ? <><div className={`font-semibold ${days !== null && days <= 14 ? "text-bad" : days !== null && days <= 30 ? "text-warn" : ""}`}>{relativeDays(days!)}</div><div className="text-xs muted">deadline {prettyDate(o.deadline, { day: "numeric", month: "short", year: "numeric" })}</div></> : <div className="text-xs muted">deadline not listed</div>}
              </div>
            </div>
            {o.summary && <p className="text-sm mt-2">{o.summary}</p>}
            <div className="flex flex-wrap justify-between items-center gap-2 mt-3">
              <span className="text-[11px] muted">via {o.source}</span>
              <SaveOppButton o={o} />
            </div>
          </article>
        );
      })}
      <p className="text-xs muted">Found {prettyDate(r.data.refreshed.slice(0, 10))}. AI search results can be out of date, so always check the official page before applying.</p>
    </div>
  );
}

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type = "All" } = await searchParams;
  const saved = await loadSavedOpps().catch(() => ({ demo: false, saved: [] }));
  const today = todayISO();
  const upcoming = saved.saved.filter((s) => !/reject|closed|declin/i.test(s.status)).sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));
  return (
    <div className="space-y-5">
      <PageHeader title="🚀 Opportunities" subtitle={`New jobs, PhDs, MSc programmes and schools in ${INTERESTS.opportunityFields}. Refreshed daily.`} />
      {upcoming.length > 0 && (
        <Section title="⭐ My saved list">
          <ul className="space-y-2">
            {upcoming.map((s, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2 text-sm">
                <span><a href={s.link} target="_blank" rel="noreferrer" className="font-medium hover:underline">{s.title}</a> <span className="muted text-xs">· {s.type} · {s.status}</span></span>
                {s.deadline && <span className={`text-xs ${daysBetween(today, s.deadline) <= 14 ? "text-bad" : "muted"}`}>{prettyDate(s.deadline)} · {relativeDays(daysBetween(today, s.deadline))}</span>}
              </li>
            ))}
          </ul>
          <p className="text-xs muted mt-3">Update the Status column (Interested → Applying → Applied → Interview → Offer) in your Life sheet.</p>
        </Section>
      )}
      <Section title="🔎 Search directly">
        <div className="flex flex-wrap gap-2 text-sm">
          {QUICK.map((q) => <a key={q.label} href={q.url} target="_blank" rel="noreferrer" className="rounded-lg border px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5">{q.label} ↗</a>)}
        </div>
        <p className="text-xs muted mt-2">These open LinkedIn and NUS with your searches already filled in (LinkedIn ones show the last 7 days).</p>
      </Section>
      <div className="flex flex-wrap gap-2">{TYPES.map((t) => <a key={t.key} href={t.key === "All" ? "/opportunities" : `/opportunities?type=${t.key}`} className={`chip ${type === t.key ? "soft" : "muted"}`}>{t.label}</a>)}</div>
      <Section title="Open now">
        <Suspense fallback={<p className="text-sm muted animate-pulse">Searching the web for open positions… (the first visit of the day takes up to a minute)</p>}><Found type={type} /></Suspense>
      </Section>
    </div>
  );
}
