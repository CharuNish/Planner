import { unstable_cache } from "next/cache";
import { todayISO } from "./dates";

/**
 * Runs `fn` at most once per day and remembers the result (Vercel's free data cache).
 * If `fn` throws, nothing is saved, so the next visit tries again.
 */
export function daily<T>(key: string, fn: () => Promise<T>) {
  const cached = unstable_cache(async (day: string) => { void day; return fn(); }, [key, "v1"], { revalidate: 60 * 60 * 26, tags: ["daily"] });
  return () => cached(todayISO());
}
