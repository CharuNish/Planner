import { DeadlineCountdown } from "@/components/deadline-countdown";
import { Section } from "@/components/ui";
import { CONFERENCES, LAST_CHECKED, deadlineMs, upcomingConferences, type Conference } from "@/lib/conferences";
import { prettyDate } from "@/lib/dates";

const fmt = (iso: string) => prettyDate(iso, { day: "numeric", month: "short", year: "numeric" });
const STATUS: Record<Conference["status"], { label: string; cls: string }> = {
  confirmed: { label: "✓ confirmed", cls: "text-good" },
  unconfirmed: { label: "? not official yet", cls: "text-warn" },
  estimated: { label: "≈ estimated", cls: "text-warn" },
  tba: { label: "TBA", cls: "muted" },
};
const rankCls = (r: string) => (r === "A*" ? "text-good" : r === "A" ? "text-accent" : r === "B" ? "text-warn" : "muted");

function daysLeft(iso: string) {
  return Math.ceil((deadlineMs(iso) - Date.now()) / 86400000);
}

/** Upcoming paper-submission deadlines in computer vision, XAI and fuzzy logic (next 12 months). */
const TOPICS = ["All", "CV", "XAI", "Fuzzy"] as const;

export function DeadlinesView({ topic = "All" }: { topic?: string }) {
  const all = upcomingConferences();
  const pick = (c: Conference) => topic === "All" || c.topics.includes(topic as Conference["topics"][number]);
  const dated = all.dated.filter(pick), tba = all.tba.filter(pick);
  const next = dated[0];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="text-sm muted max-w-2xl">Conferences where you can submit computer vision, XAI or fuzzy logic papers, with deadlines in the next 12 months. Passed deadlines disappear by themselves. Deadlines are end of day, Anywhere on Earth. Checked {fmt(LAST_CHECKED)}: ask Claude to refresh the list when you need it.</p>
        {next && <DeadlineCountdown deadline={next.deadline!} label={next.short} estimated={next.status === "estimated"} />}
      </div>
      <div className="flex flex-wrap gap-2">{TOPICS.map((t) => <a key={t} href={t === "All" ? "/updates?view=deadlines" : `/updates?view=deadlines&topic=${t}`} className={`chip ${topic === t ? "soft" : "muted"}`}>{t === "All" ? "All" : t === "CV" ? "👁️ Computer vision" : t === "XAI" ? "🔍 XAI" : "🌫️ Fuzzy logic"}</a>)}</div>
      <Section title={`🗓️ Upcoming submission deadlines (${dated.length})`}>
        {dated.length === 0 ? <p className="text-sm muted">No dated deadlines left in the list. Time to ask Claude for a refresh!</p> : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm min-w-[720px]">
              <thead><tr className="text-left text-xs muted"><th className="p-2">Conference</th><th className="p-2">Where</th><th className="p-2">Dates</th><th className="p-2">Submission deadline</th><th className="p-2">Rank</th></tr></thead>
              <tbody>
                {dated.map((c) => {
                  const d = daysLeft(c.deadline!);
                  const st = STATUS[c.status];
                  return (
                    <tr key={c.short} className="border-t align-top">
                      <td className="p-2"><a href={c.url} target="_blank" rel="noreferrer" className="font-semibold hover:underline">{c.short}</a><div className="text-xs muted">{c.name}</div><div className="flex flex-wrap gap-1 mt-1">{c.topics.map((t) => <span key={t} className="chip soft">{t}</span>)}</div></td>
                      <td className="p-2">{c.city}<div className="text-xs muted">{c.country}</div></td>
                      <td className="p-2 whitespace-nowrap">{c.dates}</td>
                      <td className="p-2">
                        <div className="font-semibold whitespace-nowrap">{c.status === "estimated" ? "~" : ""}{fmt(c.deadline!)}</div>
                        {c.abstract && c.abstract !== c.deadline && <div className="text-xs muted">abstract {fmt(c.abstract)}</div>}
                        <div className={`text-xs ${d <= 14 ? "text-bad" : d <= 45 ? "text-warn" : "muted"}`}>{d} days left</div>
                        <div className={`text-[11px] ${st.cls}`}>{st.label}</div>
                        {c.note && <div className="text-[11px] muted mt-0.5">{c.note}</div>}
                      </td>
                      <td className={`p-2 font-semibold ${rankCls(c.rank)}`}>{c.rank === "check" ? <span className="muted text-xs">check CORE</span> : c.rank}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
      {tba.length > 0 && (
        <Section title="⏳ Coming up, deadline not announced yet">
          <ul className="space-y-2 text-sm">
            {tba.map((c) => (
              <li key={c.short} className="flex flex-wrap justify-between gap-2">
                <span><a href={c.url} target="_blank" rel="noreferrer" className="font-semibold hover:underline">{c.short}</a> <span className="muted">· {c.city}{c.country !== c.city ? `, ${c.country}` : ""} · {c.dates}</span>{c.note && <span className="block text-[11px] muted">{c.note}</span>}</span>
                <span className={`text-xs font-semibold ${rankCls(c.rank)}`}>{c.rank}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <p className="text-xs muted">Ranks are CORE 2023 (A* best, then A, B). &quot;Check CORE&quot; means look it up at portal.core.edu.au. {CONFERENCES.length} conferences tracked. Always confirm on the official site before planning around a date.</p>
    </div>
  );
}
