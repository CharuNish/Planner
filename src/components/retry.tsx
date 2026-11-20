import { retryDaily } from "@/app/(app)/actions";

/** Shown when a daily feed failed. Errors are remembered for the day so they don't use up your free quota. */
export function FeedError({ msg, retryKey }: { msg: string; retryKey: string }) {
  const quota = /429|quota|RESOURCE_EXHAUSTED/i.test(msg);
  return (
    <div className="text-sm space-y-2">
      <p>{quota ? "😴 Gemini's free daily allowance is used up for now, so this couldn't refresh." : "🙈 This couldn't load right now."}</p>
      <details className="text-xs muted"><summary className="cursor-pointer">Technical details</summary><p className="mt-1 break-words">{msg.slice(0, 600)}</p></details>
      <form action={retryDaily} className="flex items-center gap-3">
        <input type="hidden" name="key" value={retryKey} />
        <button className="text-xs rounded-lg border px-3 py-1.5">↻ Try again</button>
        <span className="text-xs muted">{quota ? "Try again later, or it will refresh automatically tomorrow morning." : "Otherwise it refreshes automatically tomorrow morning."}</span>
      </form>
    </div>
  );
}
