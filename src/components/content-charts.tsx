"use client";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Row = Record<string, string | number | null>;
type Account = { channel: string; platform: string };

const axis = { stroke: "var(--muted)", fontSize: 11, tickLine: false, axisLine: false } as const;
const tooltipStyle = { background: "rgba(36,16,40,.96)", border: "1px solid rgba(244,114,182,.4)", borderRadius: 14, fontSize: 12, color: "var(--fg)", boxShadow: "0 0 24px rgba(244,114,182,.25)" };
const short = (n: number) => (Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${Math.round(n)}`);
const day = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
// Life with C = solid line, Ane Manda = dashed line, so the channel never depends on colour alone.
const dash = (channel: string) => (channel === "Ane Manda" ? "6 4" : undefined);

function Legend({ accounts, colors }: { accounts: Account[]; colors: Record<string, string> }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs muted mt-3">
      {accounts.map((a) => (
        <span key={a.channel + a.platform} className="inline-flex items-center gap-1.5">
          <svg width="22" height="8" aria-hidden><line x1="1" y1="4" x2="21" y2="4" stroke={colors[a.platform]} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={dash(a.channel)} /></svg>
          {a.channel} · {a.platform}
        </span>
      ))}
    </div>
  );
}

function TrendChart({ data, accounts, colors, unit }: { data: Row[]; accounts: Account[]; colors: Record<string, string>; unit: string }) {
  if (data.length < 2) return <p className="text-sm muted py-10 text-center">Add a couple more rows in your sheet and the chart will bloom here 🌸</p>;
  return (
    <>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ left: -8, right: 10, top: 8 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="date" {...axis} tickFormatter={day} minTickGap={28} />
          <YAxis {...axis} tickFormatter={short} domain={["auto", "auto"]} width={48} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "rgba(244,114,182,.45)", strokeWidth: 1 }} labelFormatter={(l) => day(String(l))} formatter={(v, name) => [`${Number(v).toLocaleString()} ${unit}`, String(name).replace("|", " · ")]} />
          {accounts.map((a) => (
            <Line key={a.channel + a.platform} type="monotone" isAnimationActive={false} connectNulls name={`${a.channel}|${a.platform}`} dataKey={`${a.channel}|${a.platform}`}
              stroke={colors[a.platform]} strokeWidth={2} strokeDasharray={dash(a.channel)} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card-solid)" }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <Legend accounts={accounts} colors={colors} />
    </>
  );
}

export function ContentTrends({ followers, likes, accounts, channels, colors }: { followers: Row[]; likes: Row[]; accounts: Account[]; channels: string[]; colors: Record<string, string> }) {
  const [channel, setChannel] = useState("All");
  const shown = accounts.filter((a) => channel === "All" || a.channel === channel);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Show channel">
        {["All", ...channels].map((c) => (
          <button key={c} role="tab" aria-selected={channel === c} onClick={() => setChannel(c)} className={`pill-btn ${channel === c ? "on" : ""}`}>{c === "All" ? "💕 Both channels" : c}</button>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <section className="card p-5">
          <h2 className="font-semibold mb-1">🌷 Followers over time</h2>
          <p className="text-xs muted mb-3">From your Followers tab</p>
          <TrendChart data={followers} accounts={shown} colors={colors} unit="followers" />
        </section>
        <section className="card p-5">
          <h2 className="font-semibold mb-1">💗 Likes adding up</h2>
          <p className="text-xs muted mb-3">Total likes so far, from your Uploads tab</p>
          <TrendChart data={likes} accounts={shown} colors={colors} unit="likes" />
        </section>
      </div>
    </div>
  );
}
