import { daily } from "./daily";
import { addDays, parseDate, todayISO } from "./dates";
import { getJSON } from "./fetchx";
import { geminiJSON, hasGemini } from "./gemini";
import { INTERESTS } from "./interests";

export type Opportunity = {
  title: string; org: string; type: "Job" | "PhD" | "MSc" | "School" | "Internship" | "Other";
  country: string; deadline: string | null; url: string; summary: string; source: string;
};

// Jobs: only these roles, and never internships.
export const JOB_TITLES = /\b(research\s+(assistant|engineer)|ai\s+engineer|a\.i\.\s+engineer|artificial\s+intelligence\s+engineer)\b/i;
const NOT_WANTED = /\b(intern(ship)?s?|trainee|placement|volunteer)\b/i;

type Search = { type: Opportunity["type"]; ask: string; where: string };
const ROLES = "Research Assistant, Research Engineer or AI Engineer JOBS (full-time or contract; NOT internships)";
const SEARCHES: Search[] = [
  { type: "Job", ask: ROLES, where: "at NUS (careers.nus.edu.sg), NTU Singapore (ntu.edu.sg careers) and SUTD (sutd.edu.sg careers). Check each university's official career/jobs pages" },
  { type: "Job", ask: ROLES, where: "at EPFL (epfl.ch careers), ETH Zurich (jobs.ethz.ch) and INSAIT in Sofia (insait.ai careers). Check each institute's official career/jobs pages" },
  { type: "Job", ask: ROLES, where: "at MBZUAI, Mohamed bin Zayed University of Artificial Intelligence in Abu Dhabi (mbzuai.ac.ae careers)" },
  { type: "Job", ask: ROLES, where: "posted on LinkedIn Jobs (linkedin.com/jobs/view links)" },
  { type: "Job", ask: ROLES, where: `at other universities, research labs and companies ${INTERESTS.opportunityRegions} (official career pages, jobs.ac.uk, EURAXESS, etc.)` },
  { type: "PhD", ask: "fully funded PhD positions / studentships", where: `${INTERESTS.opportunityRegions}, especially NUS, NTU, SUTD, MBZUAI, EPFL, ETH Zurich and INSAIT. Use official university pages, FindAPhD, EURAXESS and LinkedIn posts` },
  { type: "MSc", ask: "Master's (MSc) programmes and scholarships currently accepting applications", where: `${INTERESTS.opportunityRegions}, especially NUS, NTU, SUTD, MBZUAI, EPFL, ETH Zurich and INSAIT. Use official pages and LinkedIn posts` },
  { type: "School", ask: "summer schools, winter schools and short research programmes (including ones for students)", where: INTERESTS.opportunityRegions },
];

function sourceOf(url: string) {
  if (/linkedin\.com/i.test(url)) return "LinkedIn";
  const known: [RegExp, string][] = [[/nus\.edu\.sg/i, "NUS"], [/ntu\.edu\.sg/i, "NTU"], [/sutd\.edu\.sg/i, "SUTD"], [/mbzuai/i, "MBZUAI"], [/epfl\.ch/i, "EPFL"], [/ethz\.ch/i, "ETH Zurich"], [/insait/i, "INSAIT"]];
  for (const [re, name] of known) if (re.test(url)) return name;
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "web search"; }
}

/** Uses Gemini with live Google Search to find open opportunities with deadlines. */
async function searchKind(kind: Search): Promise<Opportunity[]> {
  const today = todayISO();
  const { data, sources } = await geminiJSON<{ title: string; org: string; country: string; deadline: string | null; url: string; summary: string }[]>(
    `Today is ${today}. Search the web for currently OPEN ${kind.ask} in ${INTERESTS.opportunityFields}, ${kind.where}.\n` +
    `Only include ones still open (application deadline after ${today}, or no deadline but posted recently). Find up to 8. Use the real link to the posting.\n` +
    `Answer ONLY with a JSON array: [{"title": "...", "org": "university or company", "country": "...", "deadline": "YYYY-MM-DD or null", "url": "link to the posting", "summary": "one friendly sentence on what it is and who it suits"}]`,
    { search: true, temperature: 0.2 });
  const fallbackUrl = sources[0]?.uri || "";
  return (Array.isArray(data) ? data : []).filter((o) => o && o.title).map((o) => {
    const url = /^https?:\/\//.test(o.url || "") ? o.url : fallbackUrl;
    return { title: o.title, org: o.org || "", type: kind.type, country: o.country || "", deadline: parseDate(o.deadline) || null, url, summary: o.summary || "", source: sourceOf(url) };
  }).filter((o) => (!o.deadline || o.deadline >= today) && !NOT_WANTED.test(o.title) && (o.type !== "Job" || JOB_TITLES.test(o.title)));
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
  const results = await Promise.allSettled([...(hasGemini() ? SEARCHES.map(searchKind) : []), remoteJobs()]);
  const items = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const errors = results.filter((r) => r.status === "rejected").map((r) => String((r as PromiseRejectedResult).reason).slice(0, 160));
  if (!items.length) throw new Error(hasGemini() ? `Nothing found right now. ${errors[0] || ""}` : "Add a GEMINI_API_KEY to search for PhDs, MSc programmes and schools (see SETUP.md).");
  const seen = new Set<string>();
  const unique = items.filter((o) => { const k = (o.title + o.org).toLowerCase().replace(/\W/g, ""); return !seen.has(k) && seen.add(k); });
  unique.sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));
  return { items: unique, errors, refreshed: new Date().toISOString() };
}

export const getOpportunities = daily("opportunities-v3", allOpportunities);
