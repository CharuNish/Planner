// Content analytics: you fill in a few tabs in your Life sheet (or a separate Content sheet),
// and the Content tab turns them into follower counts, growth charts, likes and posting nudges.
//
// Tabs (created automatically with the right headers the first time the Content tab opens):
//   Followers: Date | Channel | Platform | Followers                (one row per account each time you check)
//   Uploads:   Date | Channel | Title | Type | Where | <Platform> Likes ... | <Platform> Views ... | Link | Notes
//              One row per thing you made. A reel/picture goes to every platform of that channel,
//              a "Long video" goes to YouTube only. "Where" is optional: leave it empty for that default,
//              or list the platforms (e.g. "Instagram, TikTok").
//   Follower Goals: Channel | Platform | Goal                     (one row per account; empty = next round number)
//   Collabs:   Date | Brand | Channel | Platforms | Video idea | Price | Status | Due date | Paid | Contact | Notes
import { config, contentIsDemo } from "./config";
import { addDays, daysBetween, parseDate, todayISO } from "./dates";
import { ensureTab, num, readSheet, str } from "./google";

export const CHANNELS = ["Life with C", "Ane Manda"] as const;
export const PLATFORMS = ["Instagram", "Facebook", "TikTok", "YouTube"] as const;
export type Platform = (typeof PLATFORMS)[number];
/** Which platforms each channel is on. */
export const CHANNEL_PLATFORMS: Record<string, Platform[]> = {
  "Life with C": ["Instagram", "TikTok", "YouTube"],
  "Ane Manda": ["Instagram", "Facebook", "TikTok", "YouTube"],
};
export const ACCOUNTS = CHANNELS.flatMap((channel) => CHANNEL_PLATFORMS[channel].map((platform) => ({ channel, platform })));
export const UPLOAD_TYPES = ["Reel", "Picture", "Carousel", "Long video"] as const;
export const COLLAB_STATUSES = ["Talking", "Agreed", "Filming", "Posted", "Paid"] as const;
// Validated for the dark plum surface (lightness band, colour-blind separation, contrast).
export const PLATFORM_COLOR: Record<string, string> = { Instagram: "#e64596", YouTube: "#d9620f", TikTok: "#0f9a8c", Facebook: "#7076f0" };
export const PLATFORM_ICON: Record<string, string> = { Instagram: "📸", TikTok: "🎵", YouTube: "▶️", Facebook: "📘" };
export const NUDGE_DAYS = 7;

export const TAB_HEADERS = {
  Followers: ["Date", "Channel", "Platform", "Followers"],
  Uploads: ["Date", "Channel", "Title", "Type", "Where", ...PLATFORMS.map((p) => `${p} Likes`), ...PLATFORMS.map((p) => `${p} Views`), "Link", "Notes"],
  Collabs: ["Date", "Brand", "Channel", "Platforms", "Video idea", "Price", "Status", "Due date", "Paid", "Contact", "Notes"],
  "Follower Goals": ["Channel", "Platform", "Goal"],
} as const;

const TAB_DROPDOWNS: Record<keyof typeof TAB_HEADERS, Record<string, string[]>> = {
  Followers: { Channel: [...CHANNELS], Platform: [...PLATFORMS] },
  Uploads: { Channel: [...CHANNELS], Type: [...UPLOAD_TYPES] },
  Collabs: { Channel: [...CHANNELS, "Both"], Status: [...COLLAB_STATUSES], Paid: ["Yes", "No"] },
  "Follower Goals": {},
};
const TAB_SEED: Partial<Record<keyof typeof TAB_HEADERS, unknown[][]>> = { "Follower Goals": ACCOUNTS.map((a) => [a.channel, a.platform, ""]) };
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
/** The next round number above n (1k, 2k, 5k, 10k, 20k, 50k, ...). */
export function nextMilestone(n: number) {
  for (let m = 100; ; m *= 10) for (const f of [1, 2, 5]) if (m * f > n) return m * f;
}

export type FollowerRow = { date: string; channel: string; platform: string; followers: number };
export type Upload = {
  date: string; channel: string; title: string; type: string; platforms: Platform[];
  likes: Partial<Record<Platform, number>>; views: Partial<Record<Platform, number>>; totalLikes: number; totalViews: number; link: string; notes: string;
};
export type Collab = { date: string; brand: string; channel: string; platforms: string; idea: string; price: number; status: string; due: string; paid: boolean; contact: string; notes: string };

const pick = <T extends readonly string[]>(list: T, v: string, fallback: string) => list.find((x) => x.toLowerCase() === v.toLowerCase()) || v || fallback;
const findPlatforms = (v: string) => PLATFORMS.filter((p) => new RegExp(p === "Instagram" ? "insta|\\big\\b" : p === "Facebook" ? "facebook|\\bfb\\b" : p === "YouTube" ? "youtube|\\byt\\b" : "tiktok|tik tok|\\btt\\b", "i").test(v));
function rng(seed: number) { return () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296); }
const sumOf = (o: Partial<Record<Platform, number>>) => Object.values(o).reduce((s: number, n) => s + (n || 0), 0);

/** Where an upload went: the "Where" column if filled, otherwise every platform of the channel (YouTube only for long videos). */
export function uploadPlatforms(channel: string, type: string, where: string): Platform[] {
  const own = CHANNEL_PLATFORMS[channel] || [...PLATFORMS];
  if (where && !/^all$/i.test(where.trim())) { const p = findPlatforms(where).filter((x) => own.includes(x)); if (p.length) return p; }
  return /long/i.test(type) ? ["YouTube"] : own;
}

// ───── Reading the sheet ─────
async function tab(name: keyof typeof TAB_HEADERS) {
  try { return await readSheet(config.google.contentSheetId, name); } catch (e) {
    if (!/misnamed|parse range/i.test(String(e))) throw e;
    await ensureTab(config.google.contentSheetId, name, [...TAB_HEADERS[name]], TAB_DROPDOWNS[name], TAB_SEED[name]); // first visit: make the tab for you
    return [];
  }
}

function toUpload(r: Record<string, unknown>): Upload | null {
  const date = parseDate(r["date"]) || "";
  const channel = pick(CHANNELS, str(r["channel"]), "");
  if (!date || !channel) return null;
  const type = pick(UPLOAD_TYPES, str(r["type"]), "Reel");
  const platforms = uploadPlatforms(channel, type, str(r["where"]));
  const likes: Upload["likes"] = {}, views: Upload["views"] = {};
  for (const p of platforms) { likes[p] = num(r[`${p.toLowerCase()} likes`]); views[p] = num(r[`${p.toLowerCase()} views`]); }
  return { date, channel, title: str(r["title"]) || "(untitled)", type, platforms, likes, views, totalLikes: sumOf(likes), totalViews: sumOf(views), link: str(r["link"]), notes: str(r["notes"]) };
}

export type Goals = Record<string, number>;

export async function loadContent(): Promise<{ demo: boolean; followers: FollowerRow[]; uploads: Upload[]; collabs: Collab[]; goals: Goals }> {
  if (contentIsDemo()) return { demo: true, ...demoData() };
  const [f, u, c, g] = await Promise.all([tab("Followers"), tab("Uploads"), tab("Collabs"), tab("Follower Goals")]);
  const goals: Goals = {};
  for (const r of g) { const ch = pick(CHANNELS, str(r["channel"]), ""), p = pick(PLATFORMS, str(r["platform"]), ""); if (ch && p && num(r["goal"]) > 0) goals[accountKey(ch, p)] = num(r["goal"]); }
  const followers = f.map((r) => ({ date: parseDate(r["date"]) || "", channel: pick(CHANNELS, str(r["channel"]), ""), platform: pick(PLATFORMS, str(r["platform"]), ""), followers: num(r["followers"]) }))
    .filter((x) => x.date && x.channel && x.platform && x.followers > 0);
  const uploads = u.map(toUpload).filter((x): x is Upload => Boolean(x));
  const collabs = c.map((r) => ({
    date: parseDate(r["date"]) || "", brand: str(r["brand"]), channel: str(r["channel"]), platforms: str(r["platforms"]), idea: str(r["video idea"]), price: num(r["price"]),
    status: pick(COLLAB_STATUSES, str(r["status"]), "Talking"), due: parseDate(r["due date"]) || "", paid: /^(y|yes|true|paid|✓)/i.test(str(r["paid"])), contact: str(r["contact"]), notes: str(r["notes"]),
  })).filter((x) => x.brand);
  return { demo: false, followers, uploads, collabs, goals };
}

// ───── Analysis ─────
export const accountKey = (c: string, p: string) => `${c}|${p}`;

export function analyseContent(followers: FollowerRow[], uploads: Upload[], collabs: Collab[], today = todayISO(), goals: Goals = {}) {
  const latestOn = (c: string, p: string, upTo: string) => followers.filter((f) => f.channel === c && f.platform === p && f.date <= upTo).sort((a, b) => b.date.localeCompare(a.date))[0];

  const accounts = ACCOUNTS.map(({ channel, platform }) => {
    const rows = followers.filter((f) => f.channel === channel && f.platform === platform).sort((a, b) => a.date.localeCompare(b.date));
    const latest = rows[rows.length - 1];
    const prev = rows[rows.length - 2];
    const monthAgo = latest ? latestOn(channel, platform, addDays(today, -30)) || rows[0] : undefined;
    const mine = uploads.filter((u) => u.channel === channel && u.platforms.includes(platform)).sort((a, b) => b.date.localeCompare(a.date));
    const last = mine[0];
    const likes = mine.reduce((s, u) => s + (u.likes[platform] || 0), 0);
    // Engagement: average likes on the last 10 posts, per 100 followers.
    const recent = mine.slice(0, 10).filter((u) => (u.likes[platform] || 0) > 0);
    const recentAvg = recent.length ? recent.reduce((s, u) => s + (u.likes[platform] || 0), 0) / recent.length : 0;
    const goalSet = goals[accountKey(channel, platform)];
    const goal = goalSet || (latest ? nextMilestone(latest.followers) : 0);
    return {
      goal, goalSet: Boolean(goalSet), progress: latest && goal ? Math.min(1, latest.followers / goal) : 0,
      likesPer100: latest && recentAvg ? (recentAvg / latest.followers) * 100 : null,
      channel, platform, followers: latest?.followers ?? null, checked: latest?.date ?? null,
      change: latest && prev ? latest.followers - prev.followers : 0, change30: latest && monthAgo ? latest.followers - monthAgo.followers : 0,
      daysSince: last ? daysBetween(last.date, today) : null, lastTitle: last?.title ?? "",
      posts: mine.length, likes, avgLikes: mine.length ? Math.round(likes / mine.length) : 0,
    };
  });
  // Nudge an account once a week passes without a post (only after you've started logging uploads).
  const nudges = uploads.length ? accounts.filter((a) => a.daysSince === null || a.daysSince >= NUDGE_DAYS) : [];

  const totals = CHANNELS.map((c) => {
    const acc = accounts.filter((a) => a.channel === c);
    return { channel: c, followers: acc.reduce((s, a) => s + (a.followers || 0), 0), change30: acc.reduce((s, a) => s + a.change30, 0), likes: acc.reduce((s, a) => s + a.likes, 0) };
  });

  // Follower trend: one point per date anything was logged, carrying each account's last number forward.
  const fDates = [...new Set(followers.map((f) => f.date))].sort();
  const followerTrend = fDates.map((d) => {
    const row: Record<string, string | number | null> = { date: d };
    for (const a of ACCOUNTS) row[accountKey(a.channel, a.platform)] = latestOn(a.channel, a.platform, d)?.followers ?? null;
    return row;
  });

  // Likes trend: running total of likes per account, by upload date.
  const uDates = [...new Set(uploads.map((u) => u.date))].sort();
  const run: Record<string, number> = {};
  const likesTrend = uDates.map((d) => {
    for (const u of uploads.filter((x) => x.date === d)) for (const p of u.platforms) run[accountKey(u.channel, p)] = (run[accountKey(u.channel, p)] || 0) + (u.likes[p] || 0);
    const row: Record<string, string | number | null> = { date: d };
    for (const a of ACCOUNTS) row[accountKey(a.channel, a.platform)] = run[accountKey(a.channel, a.platform)] ?? null;
    return row;
  });

  const month = today.slice(0, 7), lastMonth = addDays(month + "-01", -1).slice(0, 7);
  const likesIn = (m: string) => uploads.filter((u) => u.date.slice(0, 7) === m).reduce((s, u) => s + u.totalLikes, 0);
  const top = [...uploads].filter((u) => u.totalLikes > 0).sort((a, b) => b.totalLikes - a.totalLikes).slice(0, 5);
  const byType = UPLOAD_TYPES.map((t) => { const us = uploads.filter((u) => u.type === t && u.totalLikes > 0); return { type: t, posts: us.length, avgLikes: us.length ? Math.round(us.reduce((s, u) => s + u.totalLikes, 0) / us.length) : 0 }; }).filter((x) => x.posts);

  // Best day to post: average likes per platform post, by the weekday it went up.
  const dayLikes = WEEKDAYS.map(() => ({ total: 0, n: 0 }));
  for (const u of uploads) for (const p of u.platforms) {
    const l = u.likes[p] || 0; if (!l) continue;
    const d = (new Date(u.date + "T00:00:00Z").getUTCDay() + 6) % 7; // Monday = 0
    dayLikes[d].total += l; dayLikes[d].n++;
  }
  const byWeekday = WEEKDAYS.map((day, i) => ({ day, posts: dayLikes[i].n, avgLikes: dayLikes[i].n ? Math.round(dayLikes[i].total / dayLikes[i].n) : 0 }));
  const bestDay = byWeekday.filter((d) => d.posts).sort((x, y) => y.avgLikes - x.avgLikes)[0] || null;
  const engaged = accounts.filter((x) => x.likesPer100 !== null).sort((x, y) => (y.likesPer100 || 0) - (x.likesPer100 || 0));

  // Collab money per month (last 6 months), by due date (or the date you added it).
  const collabMonths = Array.from({ length: 6 }, (_, i) => {
    const m = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 - (5 - i), 1)).toISOString().slice(0, 7);
    const inM = collabs.filter((c) => (c.due || c.date).slice(0, 7) === m);
    return {
      label: new Date(m + "-01T00:00:00Z").toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }),
      earned: inM.filter((c) => c.paid || c.status === "Paid").reduce((s, c) => s + c.price, 0),
      pending: inM.filter((c) => !c.paid && c.status !== "Paid" && c.status !== "Talking").reduce((s, c) => s + c.price, 0),
    };
  });

  const openCollabs = collabs.filter((c) => c.status !== "Paid" && !c.paid);
  const earned = collabs.filter((c) => c.paid || c.status === "Paid").reduce((s, c) => s + c.price, 0);
  const pending = openCollabs.filter((c) => c.status !== "Talking").reduce((s, c) => s + c.price, 0);
  const dueSoon = openCollabs.filter((c) => c.due && c.status !== "Posted" && daysBetween(today, c.due) <= 7).sort((a, b) => a.due.localeCompare(b.due));

  return {
    accounts, nudges, totals, followerTrend, likesTrend, top, byType, byWeekday, bestDay, engaged, collabMonths,
    postsThisMonth: uploads.filter((u) => u.date.slice(0, 7) === month).length,
    likesThisMonth: likesIn(month), likesLastMonth: likesIn(lastMonth),
    earned, pending, dueSoon, openCollabs,
    recent: [...uploads].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
  };
}

// ───── Sample data (shown until your sheet is connected) ─────
function demoData(): { followers: FollowerRow[]; uploads: Upload[]; collabs: Collab[]; goals: Goals } {
  const r = rng(7); const t = todayISO();
  const base: Record<string, number> = { "Life with C|Instagram": 3200, "Life with C|TikTok": 5400, "Life with C|YouTube": 900, "Ane Manda|Instagram": 1800, "Ane Manda|Facebook": 1500, "Ane Manda|TikTok": 2600, "Ane Manda|YouTube": 400 };
  const followers: FollowerRow[] = [];
  for (let i = 84; i >= 0; i -= 7) for (const [k, b] of Object.entries(base)) {
    const [channel, platform] = k.split("|");
    followers.push({ date: addDays(t, -i), channel, platform, followers: Math.round(b * (1 + ((84 - i) / 84) * (0.1 + r() * 0.15))) });
  }
  const ideas = ["Morning routine", "What I eat in a day", "Rice cooker biryani", "Room makeover", "Study with me", "Get ready with me", "Kandy day trip", "Thrift haul"];
  const uploads: Upload[] = [];
  for (const [channel, gap, stop] of [["Life with C", 4, 3], ["Ane Manda", 5, 9]] as const) {
    for (let i = 80; i >= stop; i -= gap + Math.floor(r() * 3)) {
      const type = r() > 0.85 ? "Long video" : r() > 0.3 ? "Reel" : r() > 0.5 ? "Carousel" : "Picture";
      const platforms = uploadPlatforms(channel, type, "");
      const likes: Upload["likes"] = {}, views: Upload["views"] = {};
      for (const p of platforms) { const v = Math.round((p === "TikTok" ? 4000 : p === "Instagram" ? 2500 : 1200) * (0.3 + r() * 2)); views[p] = v; likes[p] = Math.round(v * (0.04 + r() * 0.08)); }
      uploads.push({ date: addDays(t, -i), channel, title: ideas[Math.floor(r() * ideas.length)], type, platforms, likes, views, totalLikes: sumOf(likes), totalViews: sumOf(views), link: "", notes: "" });
    }
  }
  const collabs: Collab[] = [
    { date: addDays(t, -20), brand: "Glow Skincare", channel: "Life with C", platforms: "Instagram, TikTok", idea: "Night routine with the serum", price: 25000, status: "Paid", due: addDays(t, -10), paid: true, contact: "", notes: "" },
    { date: addDays(t, -6), brand: "Café Bloom", channel: "Ane Manda", platforms: "All", idea: "Brunch date reel", price: 15000, status: "Filming", due: addDays(t, 4), paid: false, contact: "", notes: "" },
    { date: addDays(t, -50), brand: "Sweet Crumbs", channel: "Ane Manda", platforms: "All", idea: "Cake tasting", price: 12000, status: "Paid", due: addDays(t, -45), paid: true, contact: "", notes: "" },
    { date: addDays(t, -80), brand: "Glow Skincare", channel: "Life with C", platforms: "Instagram", idea: "Morning routine", price: 20000, status: "Paid", due: addDays(t, -75), paid: true, contact: "", notes: "" },
    { date: addDays(t, -2), brand: "Petal Bags", channel: "Life with C", platforms: "Instagram", idea: "What's in my bag", price: 18000, status: "Talking", due: "", paid: false, contact: "", notes: "" },
  ];
  return { followers, uploads, collabs, goals: { "Life with C|Instagram": 5000, "Ane Manda|TikTok": 5000 } };
}
