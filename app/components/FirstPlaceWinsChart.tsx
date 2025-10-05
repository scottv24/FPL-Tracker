"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

/**
 * Compute per-GW top scorers from cumulative totals.
 * For GW n, GW points = total(n) - total(n-1); if (n-1) missing => 0.
 * Ties count for all tied players.
 */
function computeGwWins(
  seriesByUser: Record<string, { event: number; total_points: number }[]>,
  seriesKeys: string[]
): Record<string, number> {
  // Build quick lookup per user: event -> total_points
  const byUserEvent: Record<string, Map<number, number>> = {};
  const allEvents = new Set<number>();

  for (const name of seriesKeys) {
    const arr = seriesByUser[name] ?? [];
    const m = new Map<number, number>();
    for (const e of arr) {
      m.set(e.event, e.total_points);
      allEvents.add(e.event);
    }
    byUserEvent[name] = m;
  }

  const sortedEvents = [...allEvents].sort((a, b) => a - b);
  const wins: Record<string, number> = Object.fromEntries(seriesKeys.map(n => [n, 0]));

  for (const gw of sortedEvents) {
    // compute GW points per player
    let maxPts = -Infinity;
    const gwPts: Record<string, number> = {};

    for (const name of seriesKeys) {
      const m = byUserEvent[name];
      const totalNow = m.get(gw);
      if (typeof totalNow !== "number" || !Number.isFinite(totalNow)) {
        // no score this GW—skip from contention
        continue;
      }
      const prevTotal = m.get(gw - 1) ?? 0;
      const pts = totalNow - prevTotal;
      gwPts[name] = pts;
      if (Number.isFinite(pts)) maxPts = Math.max(maxPts, pts);
    }

    if (!Number.isFinite(maxPts)) continue;
    // award a win to all who match the max (tie-friendly)
    for (const [name, pts] of Object.entries(gwPts)) {
      if (pts === maxPts) wins[name] = (wins[name] ?? 0) + 1;
    }
  }

  return wins;
}

export default function FirstPlaceWinsChart({
  seriesByUser,
  seriesKeys,
  codesByUser,
  title = "GW Top Scorers (wins by gameweek)",
  colorForKey, // optional: (key:string)=>{hex:string}
}: {
  seriesByUser: Record<string, { event: number; total_points: number }[]>;
  seriesKeys: string[];
  codesByUser?: Record<string, string>;
  title?: string;
  /** Optional injector if you already have colorFor(key).hex */
  colorForKey?: (key: string) => { hex: string };
}) {
  const winsByName = React.useMemo(
    () => computeGwWins(seriesByUser, seriesKeys),
    [seriesByUser, seriesKeys]
  );

  const data = React.useMemo(
    () =>
      seriesKeys.map((name) => ({
        name,
        code: codesByUser?.[name],
        wins: winsByName[name] ?? 0,
      })),
    [seriesKeys, codesByUser, winsByName]
  );

  // Sort highest first for readability, stable secondary sort by name
  const sorted = React.useMemo(
    () => [...data].sort((a, b) => (b.wins - a.wins) || a.name.localeCompare(b.name)),
    [data]
  );

  return (
    <div className="rounded-xl bg-white/[.03] ring-1 ring-white/10 p-3">
      <div className="w-full h-[420px]">
        <ResponsiveContainer>
          <BarChart data={sorted} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "rgba(255,255,255,0.8)" }}
              axisLine={{ stroke: "rgba(255,255,255,0.3)" }}
              tickLine={{ stroke: "rgba(255,255,255,0.3)" }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: "rgba(255,255,255,0.8)" }}
              axisLine={{ stroke: "rgba(255,255,255,0.3)" }}
              tickLine={{ stroke: "rgba(255,255,255,0.3)" }}
              label={{ value: "Total Weeks Won", angle: -90, position: "insideCenter", offset: 0}}
            />
            <Tooltip
                cursor={false} 
              formatter={(v: any) => [v, "GW Wins"]}
              content={<CustomTooltip />}
            />
            <Bar dataKey="wins" name="GW Wins">
              {sorted.map((entry, idx) => {
                const key = (entry.name).toLowerCase().trim();
                const fill = colorForKey ? colorForKey(key).hex : "#6EA8FE"; // fallback
                return <Cell key={`cell-${idx}`} fill={fill} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  // Recharts passes bar fill as payload[0].payload.fill if you set it explicitly,
  // but since we set it in <Cell>, it's available as payload[0].color or payload[0].fill
  const fill = payload[0].payload?.fill || payload[0].color || payload[0].stroke || "#222";

  const value = payload[0].value;
  const name = payload[0].payload?.name;

  return (
    <div
      style={{
        background: fill,
        color: "white",
        borderRadius: 6,
        padding: "6px 10px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
      }}
    >
      <div className="font-semibold">{name}</div>
      <div style={{ fontSize: 12 }}>GW Wins: {value}</div>
    </div>
  );
}

