// app/components/LeaderboardCard.tsx
"use client";
import React from "react";
import clsx from "clsx";
import { colorFor, initials } from "@/app/lib/theme";
import { PlayerRow } from "../lib/fpl";


export default function LeaderboardCard(p: PlayerRow) {
  const c = colorFor(p.name);
  return (
    <div className={clsx(
      "rounded-2xl px-2 py-1 md:p-4 bg-gradient-to-r", c.gFrom, c.gTo,
      "shadow-lg transition-all hover:scale-[1.01]"
    )}
    onClick={()=>window.open(`https://fantasy.premierleague.com/entry/${p.code}/event/${p.event}`, '_blank')}
    >
      <div className="flex items-center gap-2">
        <div className={clsx(
          "h-6 w-6 rounded-full flex items-center justify-center text-white font-bold",
          "shadow-md ring-2 ring-white/20", c.twDot
        )}>{p.rank}</div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-white/95 text-lg md:text-lg font-semibold tracking-tight">{p.name}</h3>
          </div>
        </div>
        
        <div className="flex  items-end gap-2">
          {p.diffVsLeader != 0 &&
              <Chip label="Diff" value={-p.diffVsLeader} />
          }
          <Chip label="GW" value={p.deltaGw}  good={p.bestGw}/>
        </div>
        <div className="flex items-end gap-1">
            <span className="text-2xl md:text-2xl font-bold text-white/95 tabular-nums">{p.points}</span>
            <span className="text-white/70 text-sm">pts</span>
        </div>
      </div>
    </div>
  );
}

function Chip({ label, value, good, bad }:{
  label: string; value: number; good?: boolean; bad?: boolean;
}) {
  const tone = good ? "bg-yellow-600 text-white ring-yellow-300"
    : bad ? "bg-rose-400/20 text-rose-200 ring-rose-300/30"
    : "bg-white/10 text-white/90 ring-white/20";
  return (
    <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ring-1 ${tone}`}>
      <span className="opacity-80">{label}</span>
      <span className="tabular-nums">{value > 0 ? `${value}` : value}</span>
    </div>
  );
}

