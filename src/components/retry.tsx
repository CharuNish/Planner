import { retryDaily } from "@/app/(app)/actions";

/** Shown when a daily feed failed. Errors are remembered for the day so they don't use up your free quota. */
export function FeedError({ msg, retryKey }: { msg: string; retryKey: string }) {
  const quota = /429|quota|RESOURCE_EXHAUSTED/i.test(msg);
  return (
    <div className="text-sm space-y-2">
      <p className="text-bad">{quota ? "Gemini's free limit was reached for now." : "Couldn't load this right now."} <span className="muted">({msg.slice(0, 160)})</span></p>
      <form action={retryDaily} className="flex items-center gap-3">
        <input type="hidden" name="key" value={retryKey} />
        <button className="text-xs rounded-lg border px-3 py-1.5">↻ Try again</button>
        <span className="text-xs muted">{quota ? "Try again later, or it will refresh automatically tomorrow morning." : "Otherwise it refreshes automatically tomorrow morning."}</span>
      </form>
    </div>
  );
}
