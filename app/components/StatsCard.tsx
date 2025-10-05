// app/components/StatsCard.tsx
"use client";
import React from "react";

export type StatItem = { name: string; code: string; event: number; value: number };

export default function StatsCard({
  bestWeeks,
  worstWeeks,
  topBench,
}: {
  bestWeeks: StatItem[];
  worstWeeks: StatItem[];
  topBench: StatItem[]; // value is a PERCENT number now
}) {
  const safe = (rows: StatItem[]) => rows?.slice(0, 3) ?? [];
  return (
    <div className="md:col-span-6 rounded-2xl bg-gray-900 text-gray-100 p-4">
      <h2 id="leaderboard-title" className="text-slate-100 text-xl font-semibold">
        League Records
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
        <Panel title="Best Week">
          <ThreeRows rows={safe(bestWeeks)} unit="pts" />
        </Panel>
        <Panel title="Biggest Stinker">
          <ThreeRows rows={safe(worstWeeks)} unit="pts" />
        </Panel>
        <Panel title="Most Points on Bench ( % of GW )">
          <ThreeRows rows={safe(topBench)} unit="%" />
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return (
    <div className="bg-sky-950 rounded-lg shadow-lg col-span-1 p-3">
      <h3 className="font-bold">{title}</h3>
      <div className="grid grid-cols-1 gap-3 pt-3">{children}</div>
    </div>
  );
}

function ThreeRows({ rows, unit }: { rows: StatItem[]; unit: "pts" | "%" }) {
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r, i) => (
        <div
          key={`${r.code}-${r.event}-${i}`}
          className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2 py-2"
          onClick={()=>(window.location.href = `https://fantasy.premierleague.com/entry/${r.code}/event/${r.event}`)}
        >
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-slate-100">
              {r.name}
            </span>
            <span className="text-xs text-slate-300">GW {r.event}</span>
          </div>
          <MedalChip
            value={unit === "%" ? r.value : r.value}
            label={unit}
            rank={(i === 0 ? 1 : i === 1 ? 2 : 3) as 1 | 2 | 3}
          />
        </div>
      ))}
    </div>
  );
}

function MedalChip({
  label = "pts",
  value,
  rank,
}: {
  label?: string;
  value: number;
  rank: 1 | 2 | 3;
}) {
  const display =
    label === "%"
      ? `${(Math.round(value * 10) / 10).toFixed(1)}`
      : `${value}`;

  const tone =
    rank === 1
      ? "bg-gradient-to-b from-yellow-500 via-amber-600 to-amber-600 text-white text-shadow-lg/20 ring-amber-500/70"
      : rank === 2
      ? "bg-gradient-to-b from-zinc-400 via-zinc-550 to-zinc-600 text-white text-shadow-lg/20 ring-zinc-500/70"
      : "bg-gradient-to-b from-amber-700 via-amber-800 to-amber-900 text-amber-50 ring-amber-700/60";

  return (
    <div
      className={`relative overflow-hidden flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ring-1 shadow-sm ${tone}`}
      title={`${display} ${label}`}
    >
      <span className="text-lg font-extrabold tabular-nums">
        {display}
        <span className="text-sm"> {label}</span>
      </span>
      <span aria-hidden className="pointer-events-none absolute inset-y-0 -right-6 w-10 rotate-12 bg-white/15" />
    </div>
  );
}
