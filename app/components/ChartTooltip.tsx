// app/components/ChartTooltip.tsx
"use client";

import React from "react";

export default function ChipAwareTooltip({
  active,
  payload,
  label,
  chipsMeta,
  valueFormatter,
  titlePrefix = "GW",
}: {
  active?: boolean;
  payload?: any[];
  label?: any; // GW number
  chipsMeta?: Record<string, Record<number, string[]>>;
  valueFormatter?: (v: any) => string;
  titlePrefix?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const gw = Number(label);

  return (
    <div className="rounded-md bg-gray-800 text-gray-100 shadow px-3 py-2 text-sm">
      <div className="mb-2 text-xs text-gray-300">{titlePrefix} {gw}</div>
      <div className="space-y-1">
        {payload.map((item) => {
          const name = item?.dataKey as string;
          const color = item?.color || item?.stroke || "#999";
          const val = item?.value;
          const chipsHere = chipsMeta?.[name]?.[gw] ?? [];

          return (
            <div key={name} className="flex items-start gap-2">
              <span
                className="mt-1 inline-block h-2 w-2 rounded-full"
                style={{ background: color }}
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span>{name}</span>
                  <span className="tabular-nums">
                    {valueFormatter ? valueFormatter(val) : val}
                  </span>
                </div>
                {chipsHere.length > 0 && (
                  <div className="text-[11px] text-gray-400">
                    Chip: {chipsHere.join(", ")}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
