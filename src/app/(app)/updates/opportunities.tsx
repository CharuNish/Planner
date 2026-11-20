import { Suspense } from "react";
import { SaveOppButton } from "@/components/forms2";
import { FeedError } from "@/components/retry";
import { Empty, Section } from "@/components/ui";
import { daysBetween, prettyDate, relativeDays, todayISO } from "@/lib/dates";
import { settle } from "@/lib/fetchx";
import { INTERESTS } from "@/lib/interests";
import { loadSavedOpps } from "@/lib/life";
import { getOpportunities, type Opportunity } from "@/lib/opportunities";

const li = (k: string) => `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(k)}&f_TPR=r604800&f_JT=F%2CC`;
const QUICK = [
  { label: "LinkedIn: Research Engineer (CV / XAI)", url: li('"research engineer" ("computer vision" OR "explainable AI")') },
  { label: "LinkedIn: AI Engineer", url: li('"AI engineer" ("computer vision" OR "explainable")') },
  { label: "LinkedIn: Research Assistant", url: li('"research assistant" ("computer vision" OR "neuroscience" OR "psychology" OR "explainable AI")') },
  { label: "LinkedIn: PhD positions", url: li('"PhD" ("computer vision" OR "explainable AI" OR "neuroscience")') },
  { label: "LinkedIn: MSc positions", url: li('("MSc" OR "master") scholarship ("computer vision" OR "AI" OR "neuroscience")') },
  { label: "Google: summer schools (CV / XAI / neuro)", url: `https://www.google.com/search?q=${encodeURIComponent('"summer school" 2027 ("computer vision" OR "explainable AI" OR "neuroscience") application deadline')}` },
  { label: "Google: winter schools", url: `https://www.google.com/search?q=${encodeURIComponent('"winter school" ("computer vision" OR "explainable AI" OR "neuroscience" OR "machine learning") application')}` },
  { label: "FindAPhD: computer vision", url: "https://www.findaphd.com/phds/?Keywords=computer+vision" },
  { label: "EURAXESS jobs", url: "https://euraxess.ec.europa.eu/jobs/search?keywords=computer%20vision" },
];
// Google searches limited to each institution's own website, so they always work even if a careers page moves.
const site = (domain: string) => `https://www.google.com/search?q=${encodeURIComponent(`("research engineer" OR "research assistant" OR "AI engineer") site:${domain}`)}&tbs=qdr:m`;
const INSTITUTIONS = [
  { label: "NUS", url: site("nus.edu.sg") }, { label: "NTU", url: site("ntu.edu.sg") }, { label: "SUTD", url: site("sutd.edu.sg") },
  { label: "MBZUAI", url: site("mbzuai.ac.ae") }, { label: "EPFL", url: site("epfl.ch") }, { label: "ETH Zurich", url: site("ethz.ch") }, { label: "INSAIT", url: site("insait.ai") },
];
const TYPES: { key: Opportunity["type"] | "All"; label: string }[] = [
  { key: "All", label: "All" }, { key: "PhD", label: "🎓 PhD" }, { key: "MSc", label: "📘 MSc" }, { key: "School", label: "☀️ Summer/winter schools" }, { key: "Job", label: "💼 Jobs (RA / RE / AI Engineer)" },
];

async function Found({ type }: { type: string }) {
  const r = await settle(getOpportunities());
  if (!r.ok) return <FeedError msg={r.error} retryKey="opportunities" />;
  const today = todayISO();
  const items = r.data.items.filter((o) => type === "All" || o.type === type);
  if (!items.length) return <Empty>Nothing in this category today. Check back tomorrow!</Empty>;
  return (
    <div className="space-y-3">
      {r.data.staleFrom && <p className="text-sm rounded-xl px-4 py-2 soft">💤 Includes your last web-search list from {prettyDate(r.data.staleFrom)} (still-open ones only).</p>}
      {items.map((o, i) => {
        const days = o.deadline ? daysBetween(today, o.deadline) : null;
        return (
          <article key={i} className="rounded-xl p-4" data-tile="">
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
      <p className="text-xs muted">Found {prettyDate(r.data.refreshed.slice(0, 10))} from free job feeds{r.data.sourceStatus?.some((x) => x.name.startsWith("Gemini") && x.found) ? " and a web search" : ""}. Always check the official page before applying.</p>
      {r.data.sourceStatus && <details className="text-xs muted"><summary className="cursor-pointer">Sources checked today</summary><ul className="mt-1 space-y-0.5">{r.data.sourceStatus.map((x) => <li key={x.name}>{x.error ? "✗" : "✓"} {x.name}: {x.error ? x.error : `${x.found} found`}</li>)}</ul></details>}
    </div>
  );
}

/** The Opportunities part of the Updates tab (jobs, PhD, MSc, schools). */
export async function OpportunitiesView({ type }: { type: string }) {
  const saved = await loadSavedOpps().catch(() => ({ demo: false, saved: [] }));
  const today = todayISO();
  const upcoming = saved.saved.filter((s) => !/reject|closed|declin/i.test(s.status)).sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));
  return (
    <div className="space-y-5">
      <p className="text-sm muted">RA / Research Engineer / AI Engineer jobs, PhDs, MSc programmes and schools in {INTERESTS.opportunityFields}. Checks NUS, NTU, SUTD, MBZUAI, EPFL, ETH Zurich, INSAIT and LinkedIn once a day.</p>
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
        <div className="flex flex-wrap gap-2 text-sm mt-3"><span className="muted text-xs self-center">University jobs (last month):</span>
          {INSTITUTIONS.map((q) => <a key={q.label} href={q.url} target="_blank" rel="noreferrer" className="rounded-lg border px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5">{q.label} ↗</a>)}
        </div>
        <p className="text-xs muted mt-2">LinkedIn links show the last 7 days. University links search each institution&apos;s own website for RA / RE / AI Engineer posts from the last month.</p>
      </Section>
      <div className="flex flex-wrap gap-2">{TYPES.map((t) => <a key={t.key} href={t.key === "All" ? "/updates?view=opportunities" : `/updates?view=opportunities&type=${t.key}`} className={`chip ${type === t.key ? "soft" : "muted"}`}>{t.label}</a>)}</div>
      <Section title="Open now">
        <Suspense fallback={<p className="text-sm muted animate-pulse">Searching the web for open positions… (the first visit of the day takes up to a minute)</p>}><Found type={type} /></Suspense>
      </Section>
    </div>
  );
}
