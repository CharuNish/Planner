import { daily } from "./daily";
import { addDays, parseDate, todayISO } from "./dates";
import { getJSON } from "./fetchx";
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

async function allOpportunities() {
  const today = todayISO();
  const remote = remoteJobs().catch(() => [] as Opportunity[]);
  let found: Opportunity[] = [];
  const errors: string[] = [];
  if (hasGemini()) {
    try { found = await webSearch(); } catch (e) { errors.push(String(e instanceof Error ? e.message : e).slice(0, 300)); }
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
  const items = [...found, ...(await remote)];
  if (!items.length) {
    if (!hasGemini()) throw new Error("Add a GEMINI_API_KEY to search for PhDs, MSc programmes and schools (see SETUP.md).");
    throw new Error(errors[0] ? `Gemini search failed: ${errors[0]}` : "The web search came back empty today.");
  }
  const seen = new Set<string>();
  const unique = items.filter((o) => { const k = (o.title + o.org).toLowerCase().replace(/\W/g, ""); return !seen.has(k) && seen.add(k); });
  unique.sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));
  return { items: unique, errors, staleFrom, refreshed: new Date().toISOString() };
}

const LAST_GOOD_KEY = "opportunities";
export const getOpportunities = daily("opportunities-c", allOpportunities);
