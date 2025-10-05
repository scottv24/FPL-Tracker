// app/components/VsAverageChart.tsx
"use client";

import React from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Legend, ResponsiveContainer, ReferenceLine, ReferenceDot, Tooltip
} from "recharts";
import ChipAwareTooltip from "./ChartTooltip";
import { palette } from "./colors";
import { colorFor } from "../lib/theme";


type SeriesByUser = Record<string, { event: number; total_points: number }[]>;

// rows: { event, Scott: +/-, Ross: +/-, ... } (relative to GW average)
function buildVsAverageRows(seriesByUser: SeriesByUser): Array<Record<string, number>> {
  const events = new Set<number>();
  Object.values(seriesByUser).forEach(arr => arr.forEach(e => events.add(e.event)));
  const sorted = Array.from(events).sort((a, b) => a - b);

  const byUser = Object.fromEntries(
    Object.entries(seriesByUser).map(([name, arr]) => [
      name,
      new Map(arr.map(x => [x.event, x.total_points])),
    ])
  );

  return sorted.map(ev => {
    let sum = 0, count = 0;
    for (const [, m] of Object.entries(byUser)) {
      const t = (m as Map<number, number>).get(ev);
      if (typeof t === "number" && Number.isFinite(t)) { sum += t; count++; }
    }
    const avg = count ? sum / count : NaN;

    const row: Record<string, number> = { event: ev } as any;
    for (const [name, m] of Object.entries(byUser)) {
      const t = (m as Map<number, number>).get(ev);
      row[name] = (typeof t === "number" && Number.isFinite(avg)) ? t - avg : NaN;
    }
    return row;
  });
}

const formatZeroAsAverage = (v: number) =>
  Math.abs(v) < 1e-9 ? "Avg" : v.toFixed(0);

export default function VsAverageChart({
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
  const data = React.useMemo(() => buildVsAverageRows(seriesByUser), [seriesByUser]);

  const handle = (s: any) => {
    if (!onWeekChange) return;
    const gw = Number(s?.activeLabel);
    if (Number.isFinite(gw)) onWeekChange(gw);
  };

  // Chip markers (vs-average y-value)
  const chipDots = React.useMemo(() => {
    const dots: React.ReactNode[] = [];
    for (let i = 0; i < seriesKeys.length; i++) {
      const name = seriesKeys[i];
      const color = colorFor(name.toLowerCase()).hex;
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
    <div className="w-full h-[420px] rounded-b-xl bg-white/[.02] ring-1 ring-white/10 p-1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{  top: 10, right: 10, left: 0, bottom: 10  }}
          onMouseMove={handle}
          onClick={handle}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
      
          <XAxis dataKey="event" tickMargin={8} height={40} label={{ value: "Gameweek", position: "insideBottom", offset: -2 }}/>      
          <YAxis
            tickMargin={6}
            tickFormatter={formatZeroAsAverage}
            label={{ value: "% Diff", angle: -90, position: "insideLeft", offset: 10}}
          />

          <Tooltip
            content={
              <ChipAwareTooltip
                chipsMeta={chipsMetaByUser}
                valueFormatter={(v) => (Number.isFinite(v) ? Number(v).toFixed(0) : "–")}
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
              stroke={colorFor(name.toLowerCase()).hex}
              strokeWidth={2}
              dot={false}
              isAnimationActive={true}   
              animationBegin={0}  
              animationDuration={600}  
              animationEasing="ease-in-out"
              connectNulls
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
