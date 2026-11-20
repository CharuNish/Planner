// Content creation: a posting queue built from your Google Drive folders (one per account),
// what's posted and how it's doing, AI captions and daily ideas. You upload to the apps yourself.
//
// Drive: one "Content" folder shared with the robot email, with a sub-folder per account, e.g.
//   Content / Life with C - Instagram, Life with C - TikTok, Ane Manda - YouTube, ...
//   (or Content / Life with C / Instagram also works). Drop videos in; they queue oldest first.
// Sheet tabs (Content sheet or Life sheet): Posts, Captions, Followers, and optional Channels.
import { config, contentFolderIsDemo, contentIsDemo } from "./config";
import { daily } from "./daily";
import { addDays, daysBetween, parseDate, todayISO } from "./dates";
import { blocks, decodeEntities, getJSON, getText, tagText } from "./fetchx";
import { driveList, num, readSheet, readSheetRows, str, type DriveFile } from "./google";

export const CHANNELS = ["Life with C", "Ane Manda"] as const;
export const PLATFORMS = ["Instagram", "TikTok", "YouTube", "Facebook"] as const;
export const POST_TYPES = ["Reel", "Short", "Video", "Post", "Carousel", "Story"] as const;
export const PLATFORM_COLOR: Record<string, string> = { Instagram: "#ec4899", TikTok: "#22d3ee", YouTube: "#f43f5e", Facebook: "#3b82f6" };
export const PLATFORM_ICON: Record<string, string> = { Instagram: "📸", TikTok: "🎵", YouTube: "▶️", Facebook: "📘" };

export type QueueItem = { row?: number; fileId: string; name: string; channel: string; platform: string; added: string; mimeType: string; size: number; seconds: number; description: string; link: string; hasThumb: boolean };
export type Account = { channel: string; platform: string; folderId: string; folderName: string };
export type Post = {
  row: number; date: string; channel: string; platform: string; title: string; type: string; link: string;
  views: number; likes: number; comments: number; shares: number; saves: number; caption: string; hashtags: string; fileId: string; notes: string;
};
export type Caption = { fileId: string; title: string; caption: string; hashtags: string; hook: string; bestTime: string; sinhala: string; onScreen: string };
export type FollowerRow = { date: string; channel: string; platform: string; followers: number; auto?: boolean };
export type ChannelInfo = { channel: string; about: string; language: string; audience: string };

const sheetTab = (name: string, withRows = false) => (withRows ? readSheetRows : readSheet)(config.google.contentSheetId, name).catch((e) => {
  if (String(e).includes("misnamed") || String(e).includes("parse range")) return [];
  throw e;
});
const pick = <T extends readonly string[]>(list: T, v: string, fallback: string) => list.find((x) => x.toLowerCase() === v.toLowerCase()) || v || fallback;
function rng(seed: number) { return () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296); }

// ───── Folders → accounts → queue ─────
const FOLDER = "application/vnd.google-apps.folder";
const findPlatform = (name: string) => PLATFORMS.find((p) => new RegExp(p === "Instagram" ? "insta|\\big\\b" : p === "Facebook" ? "facebook|\\bfb\\b" : p === "YouTube" ? "youtube|\\byt\\b|shorts" : "tiktok|tik tok", "i").test(name));
const findChannel = (name: string) => CHANNELS.find((c) => name.toLowerCase().replace(/[^a-z]/g, "").includes(c.toLowerCase().replace(/[^a-z]/g, "")));

async function findAccounts(): Promise<Account[]> {
  const top = (await driveList(config.google.contentFolderId)).filter((f) => f.mimeType === FOLDER);
  const accounts: Account[] = [];
  for (const f of top) {
    const platform = findPlatform(f.name);
    if (platform) { accounts.push({ channel: findChannel(f.name) || f.name.replace(new RegExp(`[-–|/]?\\s*${platform}.*$`, "i"), "").trim() || f.name, platform, folderId: f.id, folderName: f.name }); continue; }
    // A channel folder with platform folders inside it.
    for (const sub of (await driveList(f.id)).filter((x) => x.mimeType === FOLDER)) {
      const p = findPlatform(sub.name);
      if (p) accounts.push({ channel: findChannel(f.name) || f.name, platform: p, folderId: sub.id, folderName: `${f.name} / ${sub.name}` });
    }
  }
  return accounts;
}

const isMedia = (f: DriveFile) => /^(video|image)\//.test(f.mimeType);
function toItem(f: DriveFile, a: Account): QueueItem {
  return { fileId: f.id, name: f.name, channel: a.channel, platform: a.platform, added: f.createdTime.slice(0, 10), mimeType: f.mimeType, size: Number(f.size || 0), seconds: Math.round(Number(f.videoMediaMetadata?.durationMillis || 0) / 1000), description: f.description || "", link: f.webViewLink || "", hasThumb: Boolean(f.thumbnailLink) };
}

// Your accounts. A Drive folder or a Queue row for any other account adds it automatically.
export const DEFAULT_ACCOUNTS: [string, string][] = [
  ["Life with C", "Instagram"], ["Life with C", "TikTok"], ["Life with C", "YouTube"],
  ["Ane Manda", "Instagram"], ["Ane Manda", "Facebook"], ["Ane Manda", "TikTok"], ["Ane Manda", "YouTube"],
];
/** Stable id for a video listed by name in the Queue tab (used to link captions and posts to it). */
export const queueId = (name: string, channel: string, platform: string) => `q:${channel}|${platform}|${name}`.slice(0, 200);

/**
 * Videos waiting to be posted. Main source: the "Queue" tab (you just type the video's name; the file stays on
 * your phone/laptop). Optional: a Google Drive folder per account (CONTENT_FOLDER_ID).
 */
export async function loadQueueFiles(): Promise<{ demo: boolean; accounts: Account[]; files: QueueItem[] }> {
  if (contentIsDemo() && contentFolderIsDemo()) {
    const names: [string, string, string][] = [
      ["Life with C", "Instagram", "rice cooker biryani.mp4"], ["Life with C", "Instagram", "morning routine colombo.mp4"], ["Life with C", "TikTok", "what I eat in a day.mp4"],
      ["Life with C", "YouTube", "weekend market vlog.mp4"], ["Ane Manda", "TikTok", "trying viral snacks.mp4"], ["Ane Manda", "Facebook", "kottu at home.mp4"], ["Ane Manda", "Instagram", "rainy day.mp4"],
    ];
    const accounts = [...new Set(names.map((n) => `${n[0]}|${n[1]}`))].map((k) => { const [channel, platform] = k.split("|"); return { channel, platform, folderId: "", folderName: `${channel} - ${platform}` }; });
    return { demo: true, accounts, files: names.map(([channel, platform, name], i) => ({ fileId: `demo${i}`, name, channel, platform, added: addDays(todayISO(), -10 + i), mimeType: "video/mp4", size: 0, seconds: 20 + i * 7, description: "", link: "", hasThumb: false })) };
  }
  const accounts: Account[] = DEFAULT_ACCOUNTS.map(([channel, platform]) => ({ channel, platform, folderId: "", folderName: "" }));
  const files: QueueItem[] = [];
  if (!contentIsDemo()) {
    for (const r of await sheetTab("Queue", true)) {
      const name = str(r["video"] ?? r["name"] ?? r["file"]);
      const status = str(r["status"]).toLowerCase();
      if (!name || /post|skip|done/.test(status)) continue;
      const channel = pick(CHANNELS, str(r["channel"]), "Life with C"), platform = pick(PLATFORMS, str(r["platform"]), "Instagram");
      const type = str(r["type"]);
      const isImages = /carousel|image|photo|post/i.test(type);
      files.push({ row: Number(r["__row"]), fileId: queueId(name, channel, platform), name, channel, platform, added: parseDate(r["added"]) || todayISO(), mimeType: isImages ? "image/jpeg" : "video/mp4", size: 0, seconds: 0, description: [isImages ? `(${type})` : "", str(r["note"] ?? r["notes"])].filter(Boolean).join(" "), link: "", hasThumb: false });
    }
  }
  if (!contentFolderIsDemo()) {
    const driveAccounts = await findAccounts();
    const lists = await Promise.all(driveAccounts.map(async (a) => (await driveList(a.folderId)).filter(isMedia).map((f) => toItem(f, a))));
    files.push(...lists.flat());
    for (const d of driveAccounts) { const ex = accounts.find((x) => x.channel === d.channel && x.platform === d.platform); if (ex) Object.assign(ex, { folderId: d.folderId, folderName: d.folderName }); else accounts.push(d); }
  }
  for (const f of files) if (!accounts.some((x) => x.channel === f.channel && x.platform === f.platform)) accounts.push({ channel: f.channel, platform: f.platform, folderId: "", folderName: "" });
  return { demo: false, accounts, files };
}

// ───── Sheet data ─────
function demoPosts(): { posts: Post[]; followers: FollowerRow[] } {
  const r = rng(11); const t = todayISO(); const posts: Post[] = [];
  const ideas = ["Morning routine in Colombo", "What I eat in a day", "Study with me 2h", "5 cheap date ideas", "Room makeover", "Gym progress check", "Day in my life: uni", "Air fryer chicken"];
  let row = 2;
  for (let i = 60; i >= 0; i -= 2 + Math.floor(r() * 3)) {
    const channel = r() > 0.45 ? "Life with C" : "Ane Manda";
    const platform = PLATFORMS[Math.floor(r() * (channel === "Life with C" ? 3 : 4))];
    const type = platform === "YouTube" ? (r() > 0.5 ? "Short" : "Video") : platform === "Facebook" ? "Post" : r() > 0.3 ? "Reel" : "Carousel";
    const views = i < 2 ? 0 : Math.round((platform === "TikTok" ? 4000 : platform === "Instagram" ? 2500 : 1200) * (0.3 + r() * 2.2) * (type === "Reel" || type === "Short" ? 1.4 : 1));
    posts.push({ row: row++, date: addDays(t, -i), channel, platform, title: ideas[Math.floor(r() * ideas.length)], type, link: "", views, likes: Math.round(views * (0.04 + r() * 0.08)), comments: Math.round(views * r() * 0.01), shares: Math.round(views * r() * 0.01), saves: Math.round(views * r() * 0.015), caption: "", hashtags: ["#srilanka #dayinmylife", "#foodie #ricecooker", "#studywithme", "#colombo #vlog"][Math.floor(r() * 4)], fileId: "", notes: "" });
  }
  const followers: FollowerRow[] = [];
  const base: Record<string, number> = { "Life with C|Instagram": 3200, "Life with C|TikTok": 5400, "Life with C|YouTube": 900, "Ane Manda|Instagram": 1800, "Ane Manda|TikTok": 2600, "Ane Manda|YouTube": 400, "Ane Manda|Facebook": 1500 };
  for (let i = 84; i >= 0; i -= 7) for (const [k, b] of Object.entries(base)) {
    const [channel, platform] = k.split("|");
    followers.push({ date: addDays(t, -i), channel, platform, followers: Math.round(b * (1 + ((84 - i) / 84) * (0.12 + r() * 0.1))) });
  }
  return { posts, followers };
}

export async function loadContentSheet(): Promise<{ demo: boolean; posts: Post[]; followers: FollowerRow[]; captions: Map<string, Caption>; channels: ChannelInfo[] }> {
  if (contentIsDemo()) return { demo: true, ...demoPosts(), captions: new Map(), channels: [] };
  const [p, f, c, ch] = await Promise.all([sheetTab("Posts", true), sheetTab("Followers"), sheetTab("Captions"), sheetTab("Channels")]);
  const posts: Post[] = p.map((r) => ({
    row: Number(r["__row"]), date: parseDate(r["date"]) || "", channel: pick(CHANNELS, str(r["channel"]), "Life with C"), platform: pick(PLATFORMS, str(r["platform"]), "Instagram"),
    title: str(r["title"]), type: pick(POST_TYPES, str(r["type"]), "Reel"), link: str(r["link"]),
    views: num(r["views"]), likes: num(r["likes"]), comments: num(r["comments"]), shares: num(r["shares"]), saves: num(r["saves"]),
    caption: str(r["caption"]), hashtags: str(r["hashtags"]), fileId: str(r["file id"]), notes: str(r["notes"]),
  })).filter((x) => x.title || x.fileId || x.link);
  const followers: FollowerRow[] = f.map((r) => ({ date: parseDate(r["date"]) || "", channel: pick(CHANNELS, str(r["channel"]), "Life with C"), platform: pick(PLATFORMS, str(r["platform"]), "Instagram"), followers: num(r["followers"]) })).filter((x) => x.date && x.followers > 0);
  const captions = new Map<string, Caption>();
  for (const r of c) { const id = str(r["file id"]); if (id) captions.set(id, { fileId: id, title: str(r["title"]), caption: str(r["caption"]), hashtags: str(r["hashtags"]), hook: str(r["hook"]), bestTime: str(r["best time"]), sinhala: str(r["sinhala"]), onScreen: str(r["on-screen text"]) }); }
  const channels: ChannelInfo[] = ch.map((r) => ({ channel: str(r["channel"]), about: str(r["about"]), language: str(r["language"]), audience: str(r["audience"]) })).filter((x) => x.channel);
  return { demo: false, posts, followers, captions, channels };
}

// ───── YouTube stats (automatic with YOUTUBE_API_KEY + YOUTUBE_CHANNELS) ─────
export type YTChannel = { name: string; title: string; subscribers: number; views: number; videos: number; recent: { id: string; title: string; published: string; views: number; likes: number; comments: number }[] };
async function youtubeChannels(): Promise<YTChannel[]> {
  if (!config.youtubeKey || !config.youtubeChannels.length) return [];
  const key = config.youtubeKey;
  return Promise.all(config.youtubeChannels.map(async ({ name, id }) => {
    const handle = id.replace(/^https?:\/\/(www\.)?youtube\.com\//, "").replace(/^channel\//, "").replace(/[/?].*$/, "");
    const q = /^UC[\w-]{20,}$/.test(handle) ? `id=${handle}` : `forHandle=${encodeURIComponent(handle.startsWith("@") ? handle : "@" + handle)}`;
    const ch = await getJSON<{ items?: { snippet: { title: string }; statistics: { subscriberCount?: string; viewCount?: string; videoCount?: string }; contentDetails: { relatedPlaylists: { uploads: string } } }[] }>(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&${q}&key=${key}`);
    const c = ch.items?.[0];
    if (!c) throw new Error(`YouTube channel "${id}" not found. Check YOUTUBE_CHANNELS.`);
    const pl = await getJSON<{ items?: { contentDetails: { videoId: string } }[] }>(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=25&playlistId=${c.contentDetails.relatedPlaylists.uploads}&key=${key}`);
    const ids = (pl.items || []).map((i) => i.contentDetails.videoId);
    const vids = ids.length ? await getJSON<{ items: { id: string; snippet: { title: string; publishedAt: string }; statistics: { viewCount?: string; likeCount?: string; commentCount?: string } }[] }>(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids.join(",")}&key=${key}`) : { items: [] };
    return {
      name, title: c.snippet.title, subscribers: Number(c.statistics.subscriberCount || 0), views: Number(c.statistics.viewCount || 0), videos: Number(c.statistics.videoCount || 0),
      recent: vids.items.map((v) => ({ id: v.id, title: decodeEntities(v.snippet.title), published: v.snippet.publishedAt.slice(0, 10), views: Number(v.statistics.viewCount || 0), likes: Number(v.statistics.likeCount || 0), comments: Number(v.statistics.commentCount || 0) })),
    };
  }));
}
export const getYouTubeChannels = daily("my-youtube", youtubeChannels);

// ───── Trends (free, no AI): Google Trends Sri Lanka + YouTube trending in Sri Lanka ─────
export type Trend = { title: string; traffic: string; link: string; source: "Google" | "YouTube" };
async function trends(): Promise<Trend[]> {
  const out: Trend[] = [];
  try {
    const xml = await getText("https://trends.google.com/trending/rss?geo=LK");
    for (const it of blocks(xml, "item").slice(0, 10)) { const t = decodeEntities(tagText(it, "title")); out.push({ title: t, traffic: tagText(it, "ht:approx_traffic") ? `${tagText(it, "ht:approx_traffic")} searches` : "", link: `https://www.google.com/search?q=${encodeURIComponent(t)}`, source: "Google" }); }
  } catch { /* skip */ }
  if (config.youtubeKey) {
    try {
      const d = await getJSON<{ items: { id: string; snippet: { title: string; channelTitle: string }; statistics: { viewCount?: string } }[] }>(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=LK&maxResults=10&key=${config.youtubeKey}`);
      for (const v of d.items || []) out.push({ title: decodeEntities(v.snippet.title), traffic: `${Number(v.statistics.viewCount || 0).toLocaleString()} views · ${v.snippet.channelTitle}`, link: `https://www.youtube.com/watch?v=${v.id}`, source: "YouTube" });
    } catch { /* skip */ }
  }
  if (!out.length) throw new Error("Couldn't load trends today.");
  return out;
}
export const getTrends = daily("content-trends", trends);

// ───── Analysis ─────
export const engagement = (p: Post) => (p.views > 0 ? (p.likes + p.comments + p.shares + p.saves) / p.views : 0);
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function buildQueue(files: QueueItem[], posts: Post[]) {
  const done = new Set(posts.map((p) => p.fileId).filter(Boolean));
  const left = files.filter((f) => !done.has(f.fileId)).sort((a, b) => a.added.localeCompare(b.added) || a.name.localeCompare(b.name, undefined, { numeric: true }));
  return left;
}

export function analyseContent(posts: Post[], followers: FollowerRow[], yt: YTChannel[]) {
  const today = todayISO();
  const allFollowers = [...followers];
  for (const c of yt) {
    const channel = pick(CHANNELS, c.name, c.name);
    if (!allFollowers.some((f) => f.date === today && f.channel === channel && f.platform === "YouTube")) allFollowers.push({ date: today, channel, platform: "YouTube", followers: c.subscribers, auto: true });
  }
  // YouTube numbers fill themselves in for posts with a YouTube link.
  for (const p of posts) {
    const m = p.link.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/);
    const v = m && yt.flatMap((c) => c.recent).find((r) => r.id === m[1]);
    if (v) { p.views = Math.max(p.views, v.views); p.likes = Math.max(p.likes, v.likes); p.comments = Math.max(p.comments, v.comments); }
  }
  const posted = [...posts].sort((a, b) => b.date.localeCompare(a.date));
  const postedThisMonth = posted.filter((p) => p.date.slice(0, 7) === today.slice(0, 7)).length;
  const postedLast7 = posted.filter((p) => daysBetween(p.date, today) < 7).length;
  const needStats = posted.filter((p) => p.views === 0 && daysBetween(p.date, today) >= 2 && daysBetween(p.date, today) <= 30);

  const keys = [...new Set(allFollowers.map((f) => `${f.channel}|${f.platform}`))];
  const accounts = keys.map((k) => {
    const [channel, platform] = k.split("|");
    const rows = allFollowers.filter((f) => f.channel === channel && f.platform === platform).sort((a, b) => a.date.localeCompare(b.date));
    const latest = rows[rows.length - 1];
    const old = [...rows].reverse().find((r) => daysBetween(r.date, latest.date) >= 28) || rows[0];
    return { channel, platform, followers: latest.followers, date: latest.date, change30: latest.followers - old.followers, auto: Boolean(latest.auto) };
  }).sort((a, b) => a.channel.localeCompare(b.channel) || b.followers - a.followers);
  const channelNames = [...new Set([...CHANNELS, ...accounts.map((a) => a.channel)])];
  const totals = channelNames.map((c) => ({ channel: c, followers: accounts.filter((a) => a.channel === c).reduce((s, a) => s + a.followers, 0), change30: accounts.filter((a) => a.channel === c).reduce((s, a) => s + a.change30, 0) })).filter((t) => t.followers > 0);

  const dates = [...new Set(allFollowers.map((f) => f.date))].sort();
  const growth = dates.map((d) => {
    const row: Record<string, string | number> = { label: d.slice(8, 10) + "/" + d.slice(5, 7) };
    for (const c of channelNames) row[c] = keys.filter((k) => k.startsWith(c + "|")).reduce((s, k) => {
      const platform = k.split("|")[1];
      const last = allFollowers.filter((f) => f.channel === c && f.platform === platform && f.date <= d).sort((a, b) => b.date.localeCompare(a.date))[0];
      return s + (last?.followers || 0);
    }, 0);
    return row;
  });

  const measured = posted.filter((p) => p.views > 0 && daysBetween(p.date, today) <= 90);
  const group = (by: (p: Post) => string) => {
    const m = new Map<string, Post[]>();
    for (const p of measured) { const k = by(p); if (k) m.set(k, [...(m.get(k) || []), p]); }
    return [...m.entries()].map(([key, ps]) => ({ key, posts: ps.length, avgViews: Math.round(ps.reduce((s, p) => s + p.views, 0) / ps.length), avgEng: ps.reduce((s, p) => s + engagement(p), 0) / ps.length })).sort((a, b) => b.avgViews - a.avgViews);
  };
  const byAccount = group((p) => `${p.channel} · ${p.platform}`);
  const byPlatform = group((p) => p.platform);
  const byType = group((p) => p.type);
  const byWeekday = group((p) => WEEKDAYS[new Date(p.date + "T00:00:00Z").getUTCDay()]);
  const byHashtag = (() => {
    const m = new Map<string, Post[]>();
    for (const p of measured) for (const h of new Set(p.hashtags.toLowerCase().match(/#[\p{L}\p{N}_]+/gu) || [])) m.set(h, [...(m.get(h) || []), p]);
    return [...m.entries()].filter(([, ps]) => ps.length >= 2).map(([key, ps]) => ({ key, posts: ps.length, avgViews: Math.round(ps.reduce((s, p) => s + p.views, 0) / ps.length) })).sort((a, b) => b.avgViews - a.avgViews).slice(0, 8);
  })();
  const top = [...measured].sort((a, b) => b.views - a.views).slice(0, 5);
  const avgViews = measured.length ? Math.round(measured.reduce((s, p) => s + p.views, 0) / measured.length) : 0;
  const totalViews30 = posted.filter((p) => daysBetween(p.date, today) < 30).reduce((s, p) => s + p.views, 0);

  const weekly = Array.from({ length: 8 }, (_, i) => {
    const end = addDays(today, -7 * (7 - i)), start = addDays(end, -6);
    const row: Record<string, string | number> = { label: end.slice(8, 10) + "/" + end.slice(5, 7) };
    for (const c of channelNames) row[c] = posted.filter((p) => p.channel === c && p.date >= start && p.date <= end).length;
    return row;
  });

  const tips: string[] = [];
  if (byPlatform[0] && byPlatform.length > 1) tips.push(`${byPlatform[0].key} gets you the most views (avg ${byPlatform[0].avgViews.toLocaleString()} per post).`);
  if (byType[0] && byType.length > 1) tips.push(`${byType[0].key}s do best: avg ${byType[0].avgViews.toLocaleString()} views vs ${byType[byType.length - 1].avgViews.toLocaleString()} for ${byType[byType.length - 1].key}s.`);
  if (byWeekday[0] && byWeekday.length > 2) tips.push(`Your ${byWeekday[0].key} posts perform best. Save your strongest videos for then.`);
  if (byHashtag[0]) tips.push(`Posts with ${byHashtag[0].key} average ${byHashtag[0].avgViews.toLocaleString()} views.`);
  if (postedLast7 === 0 && posted.length) tips.push("Nothing posted in the last 7 days. A quick post keeps the algorithm warm.");

  return { posted, postedThisMonth, postedLast7, needStats, accounts, totals, channelNames, growth, byAccount, byPlatform, byType, byWeekday, byHashtag, top, avgViews, totalViews30, weekly, tips, measured };
}

/** Days since each account last posted (for reminders and the queue cards). */
export function lastPosted(posts: Post[], channel: string, platform: string) {
  const d = posts.filter((p) => p.channel === channel && p.platform === platform).map((p) => p.date).sort().pop();
  return d ? daysBetween(d, todayISO()) : null;
}
