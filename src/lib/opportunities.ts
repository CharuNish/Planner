import { daily } from "./daily";
import { addDays, parseDate, todayISO } from "./dates";
import { getJSON } from "./fetchx";
import { geminiJSON, hasGemini } from "./gemini";
import { INTERESTS } from "./interests";

export type Opportunity = {
  title: string; org: string; type: "Job" | "PhD" | "MSc" | "School" | "Internship" | "Other";
  country: string; deadline: string | null; url: string; summary: string; source: string;
};

const KINDS: { type: Opportunity["type"]; ask: string }[] = [
  { type: "PhD", ask: "fully funded PhD positions / studentships" },
  { type: "MSc", ask: "Master's (MSc) programmes and scholarships currently accepting applications" },
  { type: "School", ask: "summer schools, winter schools, workshops and short research programmes (including ones for students)" },
  { type: "Job", ask: "research jobs, research assistant, research engineer and industry internships" },
];

/** Uses Gemini with live Google Search to find open opportunities with deadlines. */
async function searchKind(kind: (typeof KINDS)[number]): Promise<Opportunity[]> {
  const today = todayISO();
  const { data, sources } = await geminiJSON<{ title: string; org: string; country: string; deadline: string | null; url: string; summary: string }[]>(
    `Today is ${today}. Search the web for currently OPEN ${kind.ask} in ${INTERESTS.opportunityFields}, ${INTERESTS.opportunityRegions}.\n` +
    `Only include ones whose application deadline is after ${today} (or rolling/unknown but clearly still open). Find up to 8, from official pages (universities, labs, companies, EURAXESS, FindAPhD, jobs.ac.uk, etc.).\n` +
    `Answer ONLY with a JSON array: [{"title": "...", "org": "university or company", "country": "...", "deadline": "YYYY-MM-DD or null", "url": "official link", "summary": "one friendly sentence on what it is and who it suits"}]`,
    { search: true, temperature: 0.2 });
  const fallbackUrl = sources[0]?.uri || "";
  return (Array.isArray(data) ? data : []).filter((o) => o && o.title).map((o) => ({
    title: o.title, org: o.org || "", type: kind.type, country: o.country || "",
    deadline: parseDate(o.deadline) || null, url: /^https?:\/\//.test(o.url || "") ? o.url : fallbackUrl, summary: o.summary || "", source: "AI web search",
  })).filter((o) => !o.deadline || o.deadline >= today);
}

/** Remote ML / computer-vision jobs from Remotive's free public API. */
async function remoteJobs(): Promise<Opportunity[]> {
  const out: Opportunity[] = [];
  for (const q of ["computer vision", "machine learning research"]) {
    try {
      const d = await getJSON<{ jobs: { title: string; company_name: string; url: string; candidate_required_location: string; publication_date: string; job_type: string }[] }>(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(q)}&limit=15`);
      for (const j of d.jobs || []) {
        if (j.publication_date.slice(0, 10) < addDays(todayISO(), -30)) continue;
        out.push({ title: j.title, org: j.company_name, type: "Job", country: `Remote (${j.candidate_required_location || "anywhere"})`, deadline: null, url: j.url, summary: `${j.job_type.replace(/_/g, " ")} · posted ${j.publication_date.slice(0, 10)}`, source: "Remotive" });
      }
    } catch { /* optional source */ }
  }
  return out;
}

async function allOpportunities() {
  const results = await Promise.allSettled([...(hasGemini() ? KINDS.map(searchKind) : []), remoteJobs()]);
  const items = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const errors = results.filter((r) => r.status === "rejected").map((r) => String((r as PromiseRejectedResult).reason).slice(0, 160));
  if (!items.length) throw new Error(hasGemini() ? `Nothing found right now. ${errors[0] || ""}` : "Add a GEMINI_API_KEY to search for PhDs, MSc programmes and schools (see SETUP.md).");
  const seen = new Set<string>();
  const unique = items.filter((o) => { const k = (o.title + o.org).toLowerCase().replace(/\W/g, ""); return !seen.has(k) && seen.add(k); });
  unique.sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));
  return { items: unique, errors, refreshed: new Date().toISOString() };
}

export const getOpportunities = daily("opportunities", allOpportunities);
