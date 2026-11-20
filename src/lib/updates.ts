import { config } from "./config";
import { daily } from "./daily";
import { addDays, todayISO } from "./dates";
import { blocks, decodeEntities, getJSON, getText, stripTags, tagText } from "./fetchx";
import { geminiJSON, hasGemini } from "./gemini";
import { INTERESTS } from "./interests";

const PLAIN = "Write for a smart university student: plain, friendly English, no jargon without explanation.";

// ───────────────────────── GitHub trending ─────────────────────────
export type Repo = { name: string; url: string; description: string; language: string; stars: number; starsToday: number; summary: string };

async function trendingRepos(): Promise<Repo[]> {
  let repos: Repo[] = [];
  try {
    const html = await getText("https://github.com/trending?since=daily");
    repos = blocks(html, "article").slice(0, 10).map((a) => {
      const name = (a.match(/<h2[\s\S]*?href="\/([^"]+)"/)?.[1] || "").trim();
      const num = (s?: string) => Number((s || "0").replace(/[^0-9]/g, "")) || 0;
      return {
        name, url: `https://github.com/${name}`,
        description: stripTags(a.match(/<p class="col-9[^"]*"[^>]*>([\s\S]*?)<\/p>/)?.[1] || ""),
        language: stripTags(a.match(/itemprop="programmingLanguage">([^<]*)</)?.[1] || ""),
        stars: num(a.match(/href="\/[^"]+\/stargazers"[^>]*>[\s\S]*?<\/svg>\s*([\d,]+)/)?.[1]),
        starsToday: num(a.match(/([\d,]+)\s+stars? today/)?.[1]),
        summary: "",
      };
    }).filter((r) => r.name);
  } catch { /* fall back below */ }
  if (repos.length < 5) {
    // Fallback: the most-starred repos created this week (official GitHub API).
    const q = encodeURIComponent(`created:>${addDays(todayISO(), -7)}`);
    const data = await getJSON<{ items: { full_name: string; html_url: string; description: string; language: string; stargazers_count: number }[] }>(
      `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=10`, { headers: { Accept: "application/vnd.github+json" } });
    repos = data.items.map((r) => ({ name: r.full_name, url: r.html_url, description: r.description || "", language: r.language || "", stars: r.stargazers_count, starsToday: 0, summary: "" }));
  }
  if (!repos.length) throw new Error("No repos found");

  if (hasGemini()) {
    const readmes = await Promise.all(repos.map(async (r) => {
      try { return (await getText(`https://raw.githubusercontent.com/${r.name}/HEAD/README.md`, {}, 8000)).replace(/<[^>]+>/g, " ").slice(0, 1800); } catch { return ""; }
    }));
    try {
      const { data } = await geminiJSON<{ name: string; summary: string }[]>(
        `${PLAIN}\nFor each GitHub repository below, write a 1–2 sentence summary of what it does and who it's useful for.\nReturn JSON: [{"name": "...", "summary": "..."}]\n\n` +
        repos.map((r, i) => `### ${r.name}\nDescription: ${r.description}\nREADME start: ${readmes[i]}`).join("\n\n"));
      for (const r of repos) r.summary = data.find((d) => d.name === r.name)?.summary || "";
    } catch { /* keep descriptions */ }
  }
  return repos;
}

// ───────────────────────── Papers ─────────────────────────
export type Paper = { id: string; title: string; url: string; abstract: string; upvotes: number; published: string; topic: string; summary: string; why: string };

async function paperCandidates() {
  const out = new Map<string, Paper>();
  try {
    const hf = await getJSON<{ paper: { id: string; title: string; summary: string; upvotes: number }; publishedAt: string }[]>("https://huggingface.co/api/daily_papers?limit=100");
    for (const p of hf) {
      const text = `${p.paper.title} ${p.paper.summary}`;
      if (!INTERESTS.paperKeywords.test(text)) continue;
      out.set(p.paper.id, { id: p.paper.id, title: p.paper.title.replace(/\s+/g, " "), url: `https://arxiv.org/abs/${p.paper.id}`, abstract: p.paper.summary, upvotes: p.paper.upvotes || 0, published: (p.publishedAt || "").slice(0, 10), topic: "", summary: "", why: "" });
    }
  } catch { /* optional source */ }
  await Promise.all(INTERESTS.arxivQueries.map(async (q, qi) => {
    try {
      const xml = await getText(`https://export.arxiv.org/api/query?search_query=${encodeURIComponent(q)}&sortBy=submittedDate&sortOrder=descending&max_results=25`);
      for (const e of blocks(xml, "entry")) {
        const id = tagText(e, "id").replace(/^https?:\/\/arxiv\.org\/abs\//, "").replace(/v\d+$/, "");
        if (!id || out.has(id)) continue;
        out.set(id, { id, title: tagText(e, "title").replace(/\s+/g, " "), url: `https://arxiv.org/abs/${id}`, abstract: tagText(e, "summary").replace(/\s+/g, " "), upvotes: 0, published: tagText(e, "published").slice(0, 10), topic: INTERESTS.paperTopics[qi] || "", summary: "", why: "" });
      }
    } catch { /* optional source */ }
  }));
  return [...out.values()];
}

async function topPapers(): Promise<Paper[]> {
  const cands = await paperCandidates();
  if (!cands.length) throw new Error("Couldn't reach arXiv or Hugging Face");
  if (hasGemini()) {
    try {
      const list = cands.slice(0, 80).map((p) => `[${p.id}] (${p.upvotes} upvotes, ${p.published}) ${p.title}\n${p.abstract.slice(0, 600)}`).join("\n\n");
      const { data } = await geminiJSON<{ id: string; topic: string; summary: string; why: string }[]>(
        `${PLAIN}\nThe reader researches ${INTERESTS.paperTopics.join(", ")}. From the new papers below, pick the 5 most important and interesting for them. ` +
        `Cover each topic at least once if possible. Prefer papers with community upvotes and strong results.\n` +
        `For each, give: topic (one of ${INTERESTS.paperTopics.join(" / ")}), summary (2–3 sentences: what they did and found), why (one short line why it matters).\n` +
        `Return JSON: [{"id": "...", "topic": "...", "summary": "...", "why": "..."}]\n\n${list}`);
      const picked = data.map((d) => { const p = cands.find((c) => c.id === d.id); return p ? { ...p, topic: d.topic, summary: d.summary, why: d.why } : null; }).filter(Boolean) as Paper[];
      if (picked.length >= 3) return picked.slice(0, 5);
    } catch { /* fall back */ }
  }
  return cands.sort((a, b) => b.upvotes - a.upvotes || b.published.localeCompare(a.published)).slice(0, 5)
    .map((p) => ({ ...p, summary: p.abstract.split(/(?<=\.)\s/).slice(0, 2).join(" ") }));
}

// ───────────────────────── Medium ─────────────────────────
export type Article = { title: string; url: string; author: string; tag: string; image: string; snippet: string; published: string; why: string };

async function mediumPicks(): Promise<Article[]> {
  const all: Article[] = [];
  await Promise.all(INTERESTS.mediumTags.map(async (tag) => {
    try {
      const xml = await getText(`https://medium.com/feed/tag/${tag}`);
      for (const it of blocks(xml, "item").slice(0, 10)) {
        const content = it.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/)?.[1] || "";
        all.push({
          title: tagText(it, "title"), url: tagText(it, "link").split("?")[0], author: tagText(it, "dc:creator"), tag,
          image: decodeEntities(content).match(/<img[^>]+src="([^"]+)"/)?.[1] || "",
          snippet: stripTags(content).slice(0, 300), published: new Date(tagText(it, "pubDate") || Date.now()).toISOString().slice(0, 10), why: "",
        });
      }
    } catch { /* this tag failed */ }
  }));
  if (!all.length) throw new Error("Couldn't reach Medium");
  if (hasGemini()) {
    try {
      const { data } = await geminiJSON<{ i: number; why: string }[]>(
        `${PLAIN}\nPick the 5 best Medium articles for someone into XAI, computer vision, neuroscience, psychology and investing. ` +
        `Prefer in-depth, well-written pieces; skip spammy, listicle or promotional ones. Mix topics.\nReturn JSON: [{"i": <number>, "why": "one short line"}]\n\n` +
        all.map((a, i) => `${i}. [${a.tag}] ${a.title} by ${a.author}: ${a.snippet.slice(0, 200)}`).join("\n"));
      const picked = data.map((d) => all[d.i] && { ...all[d.i], why: d.why }).filter(Boolean) as Article[];
      if (picked.length >= 3) return picked.slice(0, 5);
    } catch { /* fall back */ }
  }
  const seen = new Set<string>();
  return all.sort((a, b) => b.published.localeCompare(a.published)).filter((a) => !seen.has(a.tag) && seen.add(a.tag)).slice(0, 5);
}

// ───────────────────────── YouTube ─────────────────────────
export type Video = { id: string; title: string; channel: string; thumbnail: string; views: number; topic: string; published: string; why: string };

async function youtubePicks(): Promise<Video[]> {
  if (!config.youtubeKey) throw new Error("Add a YOUTUBE_API_KEY to see videos (see SETUP.md)");
  const after = new Date(Date.now() - 21 * 86400000).toISOString();
  const found: Video[] = [];
  await Promise.all(INTERESTS.youtubeQueries.map(async (q) => {
    const p = new URLSearchParams({ part: "snippet", q, type: "video", order: "viewCount", publishedAfter: after, maxResults: "8", relevanceLanguage: "en", safeSearch: "moderate", videoDuration: "medium", key: config.youtubeKey });
    const data = await getJSON<{ items: { id: { videoId: string }; snippet: { title: string; channelTitle: string; publishedAt: string; thumbnails: { high?: { url: string }; medium?: { url: string } } } }[] }>(`https://www.googleapis.com/youtube/v3/search?${p}`);
    for (const it of data.items || []) found.push({ id: it.id.videoId, title: decodeEntities(it.snippet.title), channel: it.snippet.channelTitle, thumbnail: it.snippet.thumbnails.high?.url || it.snippet.thumbnails.medium?.url || "", views: 0, topic: q, published: it.snippet.publishedAt.slice(0, 10), why: "" });
  }));
  // Only English or Sinhala: drop titles/channels written in other scripts (Hindi, Tamil, Arabic, etc.).
  const OTHER_SCRIPT = /[\u0400-\u04FF\u0590-\u07FF\u0900-\u0D7F\u0E00-\u0FFF\u1000-\u109F\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/;
  for (let i = found.length - 1; i >= 0; i--) if (OTHER_SCRIPT.test(found[i].title + found[i].channel)) found.splice(i, 1);
  if (!found.length) throw new Error("No videos found");
  const stats = await getJSON<{ items: { id: string; statistics: { viewCount?: string } }[] }>(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${found.slice(0, 50).map((v) => v.id).join(",")}&key=${config.youtubeKey}`);
  for (const s of stats.items || []) { const v = found.find((x) => x.id === s.id); if (v) v.views = Number(s.statistics.viewCount || 0); }
  if (hasGemini()) {
    try {
      const { data } = await geminiJSON<{ i: number; why: string }[]>(
        `${PLAIN}\nPick the 3 best YouTube videos to watch from this list: educational, high quality, not clickbait, gossip or hype. The video must be in English or Sinhala only (never Hindi, Tamil or any other language, even if the title is in English letters). Different topics if possible.\nReturn JSON: [{"i": <number>, "why": "one short line"}]\n\n` +
        found.map((v, i) => `${i}. [${v.topic}] "${v.title}" by ${v.channel}, ${v.views.toLocaleString()} views`).join("\n"));
      const picked = data.map((d) => found[d.i] && { ...found[d.i], why: d.why }).filter(Boolean) as Video[];
      if (picked.length >= 2) return picked.slice(0, 3);
    } catch { /* fall back */ }
  }
  const seen = new Set<string>();
  return found.sort((a, b) => b.views - a.views).filter((v) => !seen.has(v.topic) && seen.add(v.topic)).slice(0, 3);
}

export const getTrending = daily("github-trending-v2", trendingRepos);
export const getPapers = daily("papers-v2", topPapers);
export const getMedium = daily("medium-v2", mediumPicks);
export const getVideos = daily("youtube-v3", youtubePicks);
