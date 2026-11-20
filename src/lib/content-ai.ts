// AI captions, hashtags and ideas (Gemini free tier). Captions are made when you press the button
// and saved to the Captions tab, so each video only uses Gemini once. Ideas refresh once a day.
import { contentIsDemo } from "./config";
import { daily } from "./daily";
import { settle } from "./fetchx";
import { geminiJSON, hasGemini } from "./gemini";
import { driveDownload } from "./google";
import { getTrends, loadContentSheet, type Caption, type ChannelInfo, type Post, type QueueItem } from "./content";

const PLATFORM_RULES: Record<string, string> = {
  Instagram: "Instagram Reel: hook in the first line, 1-3 short lines, emojis welcome, a question or call to action, then 8-15 hashtags mixing big, medium and niche tags (include Sri Lanka tags when relevant).",
  TikTok: "TikTok: very short punchy caption (under 150 characters) with 3-6 hashtags, include #fyp style discovery tags only if relevant.",
  YouTube: "YouTube: a searchable title under 70 characters (put it in title), a 2-4 line description with keywords, and 3-5 hashtags. If under 60 seconds treat it as a Short and add #shorts.",
  Facebook: "Facebook: friendly, slightly longer caption (2-4 lines) that invites comments and shares, 2-4 hashtags.",
};

function channelContext(channel: string, info: ChannelInfo[], posts: Post[]) {
  const i = info.find((c) => c.channel.toLowerCase() === channel.toLowerCase());
  const best = posts.filter((p) => p.channel === channel && p.views > 0).sort((a, b) => b.views - a.views).slice(0, 6);
  return [
    i?.about ? `About the channel: ${i.about}` : "",
    i?.language ? `Language: ${i.language}` : "",
    i?.audience ? `Audience: ${i.audience}` : "",
    best.length ? `Their best posts so far: ${best.map((p) => `"${p.title}" (${p.platform}, ${p.views} views${p.hashtags ? `, ${p.hashtags}` : ""})`).join("; ")}` : "",
  ].filter(Boolean).join("\n");
}

const FIELDS = `Return JSON: {"title": "short title for this post", "hook": "first-line hook or opening words to say", "caption": "the caption, ready to paste, WITHOUT hashtags", "hashtags": "#tag1 #tag2 ...", "onScreen": "short on-screen text overlay suggestion", "bestTime": "best day/time to post in Sri Lanka time and why, one short line", "sinhala": "the caption in natural Sinhala (Sinhala script), or empty if the channel is English only"}`;

export async function writeCaption(item: QueueItem, note: string): Promise<Caption & { watched: boolean }> {
  if (!hasGemini()) throw new Error("Add a GEMINI_API_KEY to generate captions.");
  const sheet = await loadContentSheet();
  let media: { mimeType: string; data: string } | undefined;
  // Let Gemini actually watch/see short files (up to ~12 MB) so captions match the video.
  if (!item.fileId.startsWith("demo") && item.size > 0 && item.size < 12_000_000) {
    const r = await settle(driveDownload(item.fileId));
    if (r.ok) media = { mimeType: item.mimeType, data: Buffer.from(r.data).toString("base64") };
  }
  const prompt = [
    `You are a social media manager for a Sri Lankan creator. Write the post for ONE ${item.platform} upload on the channel "${item.channel}".`,
    PLATFORM_RULES[item.platform] || "",
    channelContext(item.channel, sheet.channels, sheet.posts),
    `File name: ${item.name}${item.seconds ? ` (${item.seconds}s long)` : ""}`,
    item.description ? `File description: ${item.description}` : "",
    note ? `What the creator says the video is about: ${note}` : "",
    media ? "The video/image is attached: base everything on what actually happens in it." : "You can't see the video, so base it on the file name and notes.",
    "Natural, warm, not cringe or clickbait. No fake claims.",
    FIELDS,
  ].filter(Boolean).join("\n");
  const { data } = await geminiJSON<Partial<Caption>>(prompt, { temperature: 0.8, media });
  return { fileId: item.fileId, title: data.title || "", hook: data.hook || "", caption: data.caption || "", hashtags: data.hashtags || "", onScreen: data.onScreen || "", bestTime: data.bestTime || "", sinhala: data.sinhala || "", watched: Boolean(media) };
}

export type Idea = { channel: string; title: string; hook: string; format: string; platforms: string; why: string };

async function ideas(): Promise<Idea[]> {
  if (!hasGemini()) throw new Error("Add a GEMINI_API_KEY to get daily ideas.");
  const sheet = contentIsDemo() ? null : await loadContentSheet();
  const trends = await settle(getTrends());
  const channels = ["Life with C", "Ane Manda"];
  const prompt = [
    "You are a creative strategist for a Sri Lankan content creator with two channels. Give fresh, doable video ideas for today.",
    ...channels.map((c) => `Channel "${c}":\n${sheet ? channelContext(c, sheet.channels, sheet.posts) || "(no details yet, infer from the name)" : "(no details yet, infer from the name)"}`),
    trends.ok ? `Trending in Sri Lanka today (use only if it fits naturally, never gossip): ${trends.data.slice(0, 15).map((t) => t.title).join("; ")}` : "",
    "Give 4 ideas per channel. Easy to film on a phone at home or around Colombo, no expensive gear. Mix formats (talking, POV, tutorial, vlog, trend remix). Lean into what has performed best before.",
    `Return JSON: [{"channel": "Life with C" or "Ane Manda", "title": "idea", "hook": "first 3 seconds: what to say or show", "format": "e.g. 30s Reel, POV", "platforms": "best platforms", "why": "why it should work, one line"}]`,
  ].filter(Boolean).join("\n\n");
  const { data } = await geminiJSON<Idea[]>(prompt, { temperature: 1 });
  return data.filter((d) => d.title);
}
export const getIdeas = daily("content-ideas", ideas);
