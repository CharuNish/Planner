"use client";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export const ALLOC_COLORS = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "#fbbf24", "#34d399", "#60a5fa", "#f97316", "#a3a3a3"];
const tooltipStyle = { background: "rgba(13,16,32,.95)", border: "1px solid rgba(139,92,246,.35)", borderRadius: 10, fontSize: 12, color: "var(--fg)" };

export function AllocationChart({ data, currency }: { data: { type: string; value: number }[]; currency: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie isAnimationActive={false} data={data} dataKey="value" nameKey="type" innerRadius="58%" outerRadius="88%" paddingAngle={2} stroke="none">
          {data.map((d, i) => <Cell key={d.type} fill={ALLOC_COLORS[i % ALLOC_COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "var(--fg)" }} formatter={(v) => `${currency} ${Math.round(Number(v)).toLocaleString()}`} />
      </PieChart>
    </ResponsiveContainer>
  );
}
