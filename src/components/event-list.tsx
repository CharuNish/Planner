import { CATEGORY_STYLE, type CalEvent } from "@/lib/calendar";

export function EventRow({ e, showDate = false }: { e: CalEvent; showDate?: boolean }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <div className="w-14 shrink-0 text-xs muted tabular pt-0.5">{e.time ? e.time : "All day"}{showDate && <div>{e.date.slice(8, 10)}/{e.date.slice(5, 7)}</div>}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{e.title}</div>
        {(e.location || e.endTime) && <div className="text-xs muted truncate">{e.endTime && e.time ? `until ${e.endTime}` : ""}{e.location && e.endTime ? " · " : ""}{e.location}</div>}
      </div>
      <span className={`chip shrink-0 ${CATEGORY_STYLE[e.category] || CATEGORY_STYLE.Other}`}>{e.category}</span>
    </li>
  );
}
