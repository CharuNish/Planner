import { unstable_cache } from "next/cache";
import { todayISO } from "./dates";

type Outcome<T> = { ok: true; data: T; at: string } | { ok: false; error: string; at: string };

/**
 * Runs `fn` at most ONCE per day and remembers the result (Vercel's free data cache).
 * Errors are remembered too, so a failure doesn't burn your free quota on every visit.
 * Use the "Try again" button (retryDaily) to force a new attempt.
 */
export function daily<T>(key: string, fn: () => Promise<T>, version = "") {
  const cached = unstable_cache(
    async (day: string): Promise<Outcome<T>> => {
      void day;
      try { return { ok: true, data: await fn(), at: new Date().toISOString() }; }
      catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e), at: new Date().toISOString() }; }
    },
    [key, "v2", version], { revalidate: 60 * 60 * 26, tags: ["daily", `daily-${key}`] });
  return async () => {
    const r = await cached(todayISO());
    if (!r.ok) throw new Error(r.error);
    return r.data;
  };
}
