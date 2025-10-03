// app/components/OverallRankChart.tsx
"use client";

import React from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  ResponsiveContainer, ReferenceLine, ReferenceDot, Tooltip
} from "recharts";
import ChipAwareTooltip from "./ChartTooltip";
import { palette } from "./colors";

export default function OverallRankChart({
  rankData,
  seriesKeys,
  onWeekChange,
  chipsByUser,
  chipsMetaByUser,
}: {
  rankData: Array<Record<string, number>>;      // rows: { event, Scott: rank, Ross: rank, ... }
  seriesKeys: string[];
  onWeekChange?: (gw: number) => void;
  chipsByUser?: Record<string, number[]>;
  chipsMetaByUser?: Record<string, Record<number, string[]>>;
}) {
  const handle = (s: any) => {
    if (!onWeekChange) return;
    const gw = Number(s?.activeLabel);
    if (Number.isFinite(gw)) onWeekChange(gw);
  };

  const chipDots = React.useMemo(() => {
    const dots: React.ReactNode[] = [];
    for (let i = 0; i < seriesKeys.length; i++) {
      const name = seriesKeys[i];
      const color = palette[i % palette.length];
      const chipEvents = chipsByUser?.[name] ?? [];
      for (const ev of chipEvents) {
        const row = rankData.find((r) => r.event === ev);
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
  }, [rankData, seriesKeys, chipsByUser]);

  const formatRank = (v: any) =>
    Number.isFinite(v) ? new Intl.NumberFormat("en-GB").format(Number(v)) : "–";

  return (
    <div className="w-full h-[420px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={rankData}
          margin={{ top: 10, right: 24, left: 8, bottom: 64 }}
          onMouseMove={handle}
          onClick={handle}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="event" tickMargin={8} height={40} />
          <YAxis
            tickMargin={6}
            reversed                           // lower rank numbers appear higher (better)
            tickFormatter={(v) => new Intl.NumberFormat("en-GB").format(Number(v))}
            width={90}
          />

          <Tooltip
            content={
              <ChipAwareTooltip
                chipsMeta={chipsMetaByUser}
                valueFormatter={(v) => `#${formatRank(v)}`}
                titlePrefix="GW"
              />
            }
          />

          <Legend verticalAlign="bottom" iconType="circle" align="center" wrapperStyle={{ paddingTop: 8 }} />

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
