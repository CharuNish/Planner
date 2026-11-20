import { daily } from "./daily";
import { addDays, parseDate, todayISO } from "./dates";
import { blocks, getJSON, getText, stripTags, tagText } from "./fetchx";
import { geminiJSON, hasGemini } from "./gemini";
import { INTERESTS } from "./interests";
import { loadLastGood, saveLastGood } from "./lastgood";

export type Opportunity = {
  title: string; org: string; type: "Job" | "PhD" | "MSc" | "School" | "Internship" | "Other";
  country: string; deadline: string | null; url: string; summary: string; source: string;
};

// Jobs: only these roles, and never internships.
export const JOB_TITLES = /\b(research\s+(assistant|engineer)|ai\s+engineer|a\.i\.\s+engineer|artificial\s+intelligence\s+engineer)\b/i;
const NOT_WANTED = /\b(intern(ship)?s?|trainee|placement|volunteer)\b/i;

// ONE web search a day covering everything. Gemini's free allowance for web search is tiny
// (it is separate from, and much smaller than, the allowance for normal summaries).
const SEARCH_PROMPT = (today: string) =>
  `Today is ${today}. Search the web for currently OPEN opportunities in ${INTERESTS.opportunityFields}, in three groups:\n` +
  `1. "Job": Research Assistant, Research Engineer or AI Engineer JOBS (full-time or contract; NOT internships) at NUS (careers.nus.edu.sg), NTU Singapore, SUTD, MBZUAI, EPFL, ETH Zurich (jobs.ethz.ch) and INSAIT, from their official career pages, and on LinkedIn Jobs.\n` +
  `2. "PhD" or "MSc": fully funded PhD positions and Master's programmes/scholarships accepting applications in ${INTERESTS.opportunityRegions}, especially NUS, NTU, SUTD, MBZUAI, EPFL, ETH Zurich and INSAIT (official university pages, FindAPhD, EURAXESS, LinkedIn).\n` +
  `3. "School": summer schools, winter schools and short research programmes in ${INTERESTS.opportunityRegions}.\n` +
  `Only include ones still open (deadline after ${today}, or no deadline but posted recently). Find up to 8 per group. Use the real link to each posting.\n` +
  `Answer ONLY with a JSON array: [{"type": "Job|PhD|MSc|School", "title": "...", "org": "university or company", "country": "...", "deadline": "YYYY-MM-DD or null", "url": "link to the posting", "summary": "one friendly sentence on what it is and who it suits"}]`;

function sourceOf(url: string) {
  if (/linkedin\.com/i.test(url)) return "LinkedIn";
  const known: [RegExp, string][] = [[/nus\.edu\.sg/i, "NUS"], [/ntu\.edu\.sg/i, "NTU"], [/sutd\.edu\.sg/i, "SUTD"], [/mbzuai/i, "MBZUAI"], [/epfl\.ch/i, "EPFL"], [/ethz\.ch/i, "ETH Zurich"], [/insait/i, "INSAIT"]];
  for (const [re, name] of known) if (re.test(url)) return name;
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "web search"; }
}

/** Uses Gemini with live Google Search to find open opportunities with deadlines. */
async function webSearch(): Promise<Opportunity[]> {
  const today = todayISO();
  const { data, sources } = await geminiJSON<{ type: string; title: string; org: string; country: string; deadline: string | null; url: string; summary: string }[]>(
    SEARCH_PROMPT(today), { search: true, temperature: 0.2 });
  const fallbackUrl = sources[0]?.uri || "";
  const kinds: Opportunity["type"][] = ["Job", "PhD", "MSc", "School"];
  return (Array.isArray(data) ? data : []).filter((o) => o && o.title).map((o) => {
    const url = /^https?:\/\//.test(o.url || "") ? o.url : fallbackUrl;
    let type = kinds.find((k) => k.toLowerCase() === String(o.type || "").trim().toLowerCase()) || "Other";
    if (/^\s*(msc|master)/i.test(o.title)) type = "MSc";
    return { title: o.title.replace(/^\s*(PhD|MSc)\s*:\s*/i, ""), org: o.org || "", type, country: o.country || "", deadline: parseDate(o.deadline) || null, url, summary: o.summary || "", source: sourceOf(url) };
  }).filter((o) => o.type !== "Other" && (!o.deadline || o.deadline >= today) && !NOT_WANTED.test(o.title) && (o.type !== "Job" || JOB_TITLES.test(o.title)));
}

/** Remote ML / computer-vision jobs from Remotive's free public API. */
async function remoteJobs(): Promise<Opportunity[]> {
  const out: Opportunity[] = [];
  for (const q of ["research engineer", "AI engineer", "research assistant"]) {
    try {
      const d = await getJSON<{ jobs: { title: string; company_name: string; url: string; candidate_required_location: string; publication_date: string; job_type: string }[] }>(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(q)}&limit=15`);
      for (const j of d.jobs || []) {
        if (j.publication_date.slice(0, 10) < addDays(todayISO(), -30) || !JOB_TITLES.test(j.title) || NOT_WANTED.test(j.title + j.job_type)) continue;
        out.push({ title: j.title, org: j.company_name, type: "Job", country: `Remote (${j.candidate_required_location || "anywhere"})`, deadline: null, url: j.url, summary: `${j.job_type.replace(/_/g, " ")} · posted ${j.publication_date.slice(0, 10)}`, source: "Remotive" });
      }
    } catch { /* optional source */ }
  }
  return out;
}

// ───── Free listing feeds (no Gemini needed) ─────
// Gemini's free tier no longer includes web search for new keys, so these are the main source.
// Each one is optional: if a site changes or is down, the others still show.
const FIELD = /\b(vision|image|imaging|visual|explainab|interpretab|xai|neuro|brain|psycholog|cognit|machine learning|deep learning|artificial intelligence|\bai\b|computational)/i;
const PHD = /\b(phd|ph\.d|doctoral|doctorate|studentship)\b/i;
const MSC = /\b(msc|m\.sc|master'?s?)\b/i;

const JOBS_AC_UK = [
  "https://www.jobs.ac.uk/feeds/subject-areas/computer-sciences/artificial-intelligence",
  "https://www.jobs.ac.uk/feeds/subject-areas/computer-sciences/computer-science",
  "https://www.jobs.ac.uk/feeds/subject-areas/psychology",
  "https://www.jobs.ac.uk/feeds/subject-areas/biological-sciences/neuroscience",
];

async function rssFeed(url: string, source: string): Promise<Opportunity[]> {
  const xml = await getText(url);
  const items = blocks(xml, "item");
  if (!items.length) throw new Error("no listings in feed");
  const cutoff = addDays(todayISO(), -45);
  const out: Opportunity[] = [];
  for (const it of items) {
    const title = stripTags(tagText(it, "title"));
    const link = stripTags(tagText(it, "link")) || stripTags(tagText(it, "guid"));
    const desc = stripTags(tagText(it, "description"));
    const posted = parseDate(stripTags(tagText(it, "pubDate")).replace(/^\w+,\s*/, "")) || "";
    if (!title || !link || (posted && posted < cutoff) || NOT_WANTED.test(title)) continue;
    const text = `${title} ${desc}`;
    const type: Opportunity["type"] | null = PHD.test(title) ? "PhD" : MSC.test(title) ? "MSc" : /summer school|winter school/i.test(title) ? "School" : JOB_TITLES.test(title) ? "Job" : null;
    if (!type || (type !== "Job" && !FIELD.test(text))) continue;
    const closes = desc.match(/clos\w*\s*(?:date)?\s*:?\s*([0-9]{1,2}\s+\w+\s+[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i)?.[1];
    out.push({ title, org: desc.match(/^([^,.|]{3,60})/)?.[1]?.trim() || "", type, country: "", deadline: closes ? parseDate(closes) || null : null, url: link, summary: desc.slice(0, 180), source });
  }
  return out;
}

/** Free remote-job APIs (Remotive, Jobicy, Arbeitnow), filtered to RA / RE / AI Engineer. */
async function jobApis(): Promise<{ name: string; run: () => Promise<Opportunity[]> }[]> {
  const recent = addDays(todayISO(), -30);
  const keep = (title: string, extra = "") => JOB_TITLES.test(title) && !NOT_WANTED.test(title + " " + extra);
  return [
    { name: "Remotive", run: remoteJobs },
    { name: "Jobicy", run: async () => {
      const d = await getJSON<{ jobs?: { jobTitle: string; companyName: string; url: string; jobGeo?: string; pubDate?: string; jobType?: string[] | string }[] }>("https://jobicy.com/api/v2/remote-jobs?count=50&tag=machine%20learning");
      return (d.jobs || []).filter((j) => keep(j.jobTitle, String(j.jobType || "")) && (j.pubDate || "").slice(0, 10) >= recent)
        .map((j) => ({ title: j.jobTitle, org: j.companyName, type: "Job" as const, country: `Remote (${j.jobGeo || "anywhere"})`, deadline: null, url: j.url, summary: `posted ${(j.pubDate || "").slice(0, 10)}`, source: "Jobicy" }));
    } },
    { name: "Arbeitnow", run: async () => {
      const d = await getJSON<{ data?: { title: string; company_name: string; url: string; location: string; remote: boolean; created_at: number; job_types?: string[] }[] }>("https://www.arbeitnow.com/api/job-board-api");
      return (d.data || []).filter((j) => keep(j.title, (j.job_types || []).join(" ")) && new Date(j.created_at * 1000).toISOString().slice(0, 10) >= recent)
        .map((j) => ({ title: j.title, org: j.company_name, type: "Job" as const, country: j.remote ? `Remote / ${j.location}` : j.location, deadline: null, url: j.url, summary: (j.job_types || []).join(", "), source: "Arbeitnow" }));
    } },
    ...JOBS_AC_UK.map((u) => ({ name: `jobs.ac.uk (${u.split("/").pop()})`, run: () => rssFeed(u, "jobs.ac.uk") })),
  ];
}

async function allOpportunities() {
  const today = todayISO();
  const sourceStatus: { name: string; found: number; error?: string }[] = [];
  const feedResults = Promise.all((await jobApis()).map(async (f) => {
    try { const r = await f.run(); sourceStatus.push({ name: f.name, found: r.length }); return r; }
    catch (e) { sourceStatus.push({ name: f.name, found: 0, error: String(e instanceof Error ? e.message : e).slice(0, 120) }); return []; }
  }));
  let found: Opportunity[] = [];
  const errors: string[] = [];
  if (hasGemini()) {
    try { found = await webSearch(); sourceStatus.push({ name: "Gemini web search", found: found.length }); }
    catch (e) { const m = String(e instanceof Error ? e.message : e).slice(0, 600); errors.push(m); sourceStatus.push({ name: "Gemini web search", found: 0, error: m.slice(0, 120) }); }
  }
  // A good search is saved; a failed or empty one falls back to the last good list (only what's still open).
  let staleFrom: string | null = null;
  if (found.length) await saveLastGood(LAST_GOOD_KEY, found);
  else if (hasGemini()) {
    const last = await loadLastGood<Opportunity[]>(LAST_GOOD_KEY);
    if (last?.data?.length) {
      found = last.data.filter((o) => !o.deadline || o.deadline >= today);
      if (found.length) staleFrom = last.savedAt.slice(0, 10);
    }
  }
  const items = [...found, ...(await feedResults).flat()];
  if (!items.length) throw new Error(`No open positions found in any source today. ${sourceStatus.map((s) => `${s.name}: ${s.error || s.found}`).join("; ")}`);
  const seen = new Set<string>();
  const unique = items.filter((o) => { const k = (o.title + o.org).toLowerCase().replace(/\W/g, ""); return !seen.has(k) && seen.add(k); });
  unique.sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));
  return { items: unique, errors, staleFrom, sourceStatus, refreshed: new Date().toISOString() };
}

const LAST_GOOD_KEY = "opportunities";
export const getOpportunities = daily("opportunities-e", allOpportunities);
