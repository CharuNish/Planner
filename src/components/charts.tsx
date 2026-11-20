"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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

export function StudyHoursChart({ data, target }: { data: { label: string; hours: number }[]; target: number }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="sh" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="label" {...axis} interval={4} />
        <YAxis {...axis} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} h`, "Studied"]} />
        <ReferenceLine y={target} stroke="var(--ref)" strokeDasharray="5 4" label={{ value: `target ${target}h`, fill: "var(--muted)", fontSize: 11, position: "insideTopRight" }} />
        <Area isAnimationActive={false} type="monotone" dataKey="hours" stroke="var(--series-1)" strokeWidth={2} fill="url(#sh)" activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
