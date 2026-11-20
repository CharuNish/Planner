import { unstable_cache } from "next/cache";
import { getJSON } from "./fetchx";

// Free, openly licensed photos from Openverse, used when a goal has no Image URL.
async function findImage(query: string): Promise<string> {
  const q = query.replace(/\b(buy|get|learn|visit|see|my|a|an|the|to|in|for|first|good|properly)\b/gi, " ").replace(/\s+/g, " ").trim() || query;
  const d = await getJSON<{ results: { thumbnail?: string; url: string }[] }>(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=1&mature=false`);
  return d.results?.[0]?.thumbnail || d.results?.[0]?.url || "";
}
export const imageFor = unstable_cache(async (q: string) => findImage(q).catch(() => ""), ["goal-image", "v1"], { revalidate: 60 * 60 * 24 * 30 });
