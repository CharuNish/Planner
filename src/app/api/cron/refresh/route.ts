import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { todayISO } from "@/lib/dates";
import { settle } from "@/lib/fetchx";
import { getRecipes, isoWeek } from "@/lib/recipes";
import { getTrends, getYouTubeChannels } from "@/lib/content";
import { getMedium, getPapers, getTrending, getVideos } from "@/lib/updates";

export const maxDuration = 60;

// Runs early every morning (see vercel.json) so the Updates tab loads instantly.
// Opportunities are fetched by the reminders job an hour later.
export async function GET(req: Request) {
  if (config.cronSecret && req.headers.get("authorization") !== `Bearer ${config.cronSecret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  // One at a time with short pauses, to stay under Gemini's free per-minute limit.
  const jobs: [string, () => Promise<unknown>][] = [
    ["github", getTrending], ["papers", getPapers], ["medium", getMedium], ["youtube", getVideos], ["recipes", () => getRecipes(isoWeek(todayISO()))],
  ];
  const out: Record<string, string> = {};
  for (const [name, run] of jobs) {
    const r = await settle(run());
    out[name] = r.ok ? "ok" : r.error;
    await new Promise((res) => setTimeout(res, 3000));
  }
  // Content trends and your YouTube stats don't use Gemini, so no pauses needed.
  for (const [name, run] of [["content-trends", getTrends], ["my-youtube", getYouTubeChannels]] as [string, () => Promise<unknown>][]) { const r = await settle(run()); out[name] = r.ok ? "ok" : r.error; }
  return NextResponse.json(out);
}
