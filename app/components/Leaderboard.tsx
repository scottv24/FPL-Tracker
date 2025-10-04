// app/components/Leaderboard.tsx
import React from "react";
import LeaderboardCard from "@/app/components/LeaderboardCard";
import type { PlayerRow } from "@/app/lib/fpl";


export default function Leaderboard({ players, gameweek }: {
  players: PlayerRow[];
  gameweek: number;
}) {
  const sorted = [...players].sort((a, b) => b.points - a.points);

  return (
    <section
      className="rounded-3xl bg-slate-900/60 md:p-2 space-y-1"
      aria-labelledby="leaderboard-title"
    >
      <div className="space-y-3">
        {sorted.map((p, i) => (
          <LeaderboardCard
            key={p.name}
            rank={i + 1}
            name={p.name}
            points={p.points}
            diffVsLeader={p.diffVsLeader}
            deltaGw={p.deltaGw}
            bestGw={
                sorted.filter(v => v.deltaGw > p.deltaGw).length == 0 && 
                sorted.filter(v => v.deltaGw == p.deltaGw).length != sorted.length
            }
          />
        ))}
      </div>
      <p className="sr-only">Tap a card to see more details (coming soon).</p>
    </section>
  );
}
