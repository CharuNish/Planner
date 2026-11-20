"use client";
import { Area, ComposedChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const axis = { stroke: "var(--muted)", fontSize: 11, tickLine: false, axisLine: false } as const;
const tooltipStyle = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12, color: "var(--fg)" };
const short = (n: number) => (Math.abs(n) >= 1000 ? `${Math.round(n / 1000)}k` : `${Math.round(n)}`);

export function SpendPaceChart({ data, currency }: { data: { day: number; thisMonth: number | null; lastMonth: number; budget: number }[]; currency: string }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ left: -10, right: 8, top: 8 }}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="day" {...axis} interval={4} />
        <YAxis {...axis} tickFormatter={short} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${currency} ${Math.round(Number(v)).toLocaleString()}`} labelFormatter={(d) => `Day ${d}`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line isAnimationActive={false} name="This month" dataKey="thisMonth" stroke="var(--series-1)" strokeWidth={2.5} dot={false} connectNulls={false} />
        <Line isAnimationActive={false} name="Last month" dataKey="lastMonth" stroke="var(--series-2)" strokeWidth={2} dot={false} strokeOpacity={0.7} />
        <Line isAnimationActive={false} name="Budget pace" dataKey="budget" stroke="var(--ref)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function IncomeExpenseChart({ data, currency }: { data: { month: string; income: number; expense: number }[]; currency: string }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ left: -10, right: 8, top: 8 }} barGap={2}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="month" {...axis} />
        <YAxis {...axis} tickFormatter={short} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent-soft)" }} formatter={(v) => `${currency} ${Math.round(Number(v)).toLocaleString()}`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar isAnimationActive={false} name="Income" dataKey="income" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={22} />
        <Bar isAnimationActive={false} name="Expenses" dataKey="expense" fill="var(--series-2)" radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StudyHoursChart({ data }: { data: { label: string; hours: number; target: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="sh" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="label" {...axis} interval={4} />
        <YAxis {...axis} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [`${v} h`, name]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line isAnimationActive={false} name="Goal" type="stepAfter" dataKey="target" stroke="var(--ref)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
        <Area isAnimationActive={false} name="Studied" type="monotone" dataKey="hours" stroke="var(--series-1)" strokeWidth={2} fill="url(#sh)" activeDot={{ r: 4 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function WeightChart({ data }: { data: { label: string; kg: number; avg: number; goal: number | null }[] }) {
  const vals = data.flatMap((d) => [d.kg, d.goal ?? d.kg]);
  const min = Math.floor(Math.min(...vals) - 1), max = Math.ceil(Math.max(...vals) + 1);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ left: -15, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="label" {...axis} minTickGap={24} />
        <YAxis {...axis} domain={[min, max]} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [`${v} kg`, name]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {data[0]?.goal ? <Line isAnimationActive={false} name="Goal" dataKey="goal" stroke="var(--series-3)" strokeDasharray="5 4" strokeWidth={1.5} dot={false} /> : null}
        <Area isAnimationActive={false} name="Weigh-ins" dataKey="kg" stroke="var(--series-1)" strokeOpacity={0.35} strokeWidth={1.5} fill="url(#wg)" dot={{ r: 2.5, fill: "var(--series-1)", strokeWidth: 0 }} />
        <Line isAnimationActive={false} name="Trend" type="monotone" dataKey="avg" stroke="var(--series-1)" strokeWidth={2.5} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
