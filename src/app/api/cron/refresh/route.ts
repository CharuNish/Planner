import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { todayISO } from "@/lib/dates";
import { settle } from "@/lib/fetchx";
import { getOpportunities } from "@/lib/opportunities";
import { getRecipes, isoWeek } from "@/lib/recipes";
import { getMedium, getPapers, getTrending, getVideos } from "@/lib/updates";

export const maxDuration = 60;

// Runs early every morning (see vercel.json) so the Updates and Opportunities tabs load instantly.
export async function GET(req: Request) {
  if (config.cronSecret && req.headers.get("authorization") !== `Bearer ${config.cronSecret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const results = await Promise.all([
    settle(getTrending()), settle(getPapers()), settle(getMedium()), settle(getVideos()), settle(getOpportunities()), settle(getRecipes(isoWeek(todayISO()))),
  ]);
  const names = ["github", "papers", "medium", "youtube", "opportunities", "recipes"];
  return NextResponse.json(Object.fromEntries(results.map((r, i) => [names[i], r.ok ? "ok" : r.error])));
}
