// app/components/InlineClientChart.tsx
"use client";

import React from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  ResponsiveContainer, ReferenceLine, ReferenceDot, Tooltip
} from "recharts";
import ChipAwareTooltip from "./ChartTooltip";
import { palette } from "./colors";

export default function InlineClientChart({
  data,
  seriesKeys,
  selectedWeek,
  onWeekChange,
  chipsByUser,
  chipsMetaByUser,
}: {
  data: Array<Record<string, number>>; // rows: {event, Scott: total, ...}
  seriesKeys: string[];
  selectedWeek?: number;
  onWeekChange?: (gw: number) => void;
  chipsByUser?: Record<string, number[]>;
  chipsMetaByUser?: Record<string, Record<number, string[]>>;
}) {
  const handleMove = (state: any) => {
    if (!onWeekChange) return;
    const gw = Number(state?.activeLabel);
    if (Number.isFinite(gw)) onWeekChange(gw);
  };

  // Chip markers (ReferenceDot)
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
          margin={{ top: 10, right: 24, left: 8, bottom: 10 }}
          onMouseMove={handleMove}
          onClick={handleMove}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="event" tickMargin={8} height={40} />
          <YAxis tickMargin={6} label={{ value: "Total Points", angle: -90, position: "insideLeft" }} />

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

          {typeof selectedWeek === "number" && (
            <ReferenceLine x={selectedWeek} stroke="rgba(255,255,255,0.35)" strokeDasharray="4 4" />
          )}

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
