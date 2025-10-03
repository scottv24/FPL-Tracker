// app/components/DiffVsLeaderChart.tsx
"use client";

import React from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  ResponsiveContainer, ReferenceLine, ReferenceDot, Tooltip
} from "recharts";
import ChipAwareTooltip from "./ChartTooltip";
import { palette } from "./colors";

type SeriesByUser = Record<string, { event: number; total_points: number }[]>;

function buildDiffVsLeaderRows(seriesByUser: SeriesByUser) {
  const events = new Set<number>();
  Object.values(seriesByUser).forEach(arr => arr.forEach(e => events.add(e.event)));
  const sorted = [...events].sort((a, b) => a - b);

  const mapByUser = Object.fromEntries(
    Object.entries(seriesByUser).map(([name, arr]) => [name, new Map(arr.map(x => [x.event, x.total_points]))])
  );

  return sorted.map(ev => {
    const row: Record<string, number> = { event: ev } as any;
    let leader = -Infinity;
    for (const [, byGw] of Object.entries(mapByUser)) {
      const t = (byGw as Map<number, number>).get(ev);
      if (typeof t === "number" && t > leader) leader = t;
    }
    for (const [name, byGw] of Object.entries(mapByUser)) {
      const t = (byGw as Map<number, number>).get(ev);
      row[name] = typeof t === "number" ? t - leader : NaN;
    }
    return row;
  });
}

export default function DiffVsLeaderChart({
  seriesByUser,
  seriesKeys,
  onWeekChange,
  chipsByUser,
  chipsMetaByUser,
}: {
  seriesByUser: SeriesByUser;
  seriesKeys: string[];
  onWeekChange?: (gw: number) => void;
  chipsByUser?: Record<string, number[]>;
  chipsMetaByUser?: Record<string, Record<number, string[]>>;
}) {
  const data = React.useMemo(() => buildDiffVsLeaderRows(seriesByUser), [seriesByUser]);

  const handle = (s: any) => {
    if (!onWeekChange) return;
    const gw = Number(s?.activeLabel);
    if (Number.isFinite(gw)) onWeekChange(gw);
  };

  // Chip markers at diff y-value
  const chipDots = React.useMemo(() => {
    const dots: React.ReactNode[] = [];
    for (let i = 0; i < seriesKeys.length; i++) {
      const name = seriesKeys[i];
      const color = palette[i % palette.length];
      const chipEvents = chipsByUser?.[name] ?? [];
      for (const ev of chipEvents) {
        const row = data.find((r) => r.event === ev);
        const y = row ? (row[name] as number) : undefined;
        if (Number.isFinite(y)) {
          dots.push(
            <ReferenceDot
              key={`chip-${name}-${ev}`}
              x={ev}
              y={y as number}
              r={5}
              fill="white"
              stroke={color}
              strokeWidth={2}
            />
          );
        }
      }
    }
    return dots;
  }, [data, seriesKeys, chipsByUser]);

  return (
    <div className="w-full h-[420px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{  top: 10, right: 10, left: 0, bottom: 10 }}
          onMouseMove={handle}
          onClick={handle}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="event" tickMargin={8} height={40} />
          <YAxis tickMargin={6} label={{ value: "Points vs Leader", angle: -90, position: "insideLeft" }} />

          <Tooltip
            content={
              <ChipAwareTooltip
                chipsMeta={chipsMetaByUser}
                valueFormatter={(v) => (Number.isFinite(v) ? String(v) : "–")}
                titlePrefix="GW"
              />
            }
          />

          <Legend verticalAlign="bottom" iconType="circle" align="center" wrapperStyle={{ paddingTop: 8 }} />
          <ReferenceLine y={0} stroke="hsl(0, 0%, 85%)" strokeWidth={2} />

          {/* Chip markers */}
          {chipDots}

          {seriesKeys.map((name, idx) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={palette[idx % palette.length]}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
