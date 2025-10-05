// app/components/LeaderboardWithChart.tsx
"use client";

import React from "react";
import InlineClientChart from "./InlineClientChart";
import DiffVsLeaderChart from "./DiffVsLeaderChart";
import VsAverageChart from "./VsAverageChart";
import OverallRankChart from "./OverallRankChart";
import { colorForSeries, hsla } from "./colors";
import { PlayerRow } from "../lib/fpl";
import Leaderboard from "./Leaderboard";
import StatsCard, { StatItem } from "./StatsCard";
import FirstPlaceWinsChart from "./FirstPlaceWinsChart";
import { colorFor } from "../lib/theme";

type SeriesPoint = { event: number; total_points: number };
type SeriesByUser = Record<string, SeriesPoint[]>;

export default function LeaderboardWithChart({
  cumulativeData,
  leagueRankData,
  overallRankData,
  seriesKeys,
  codesByUser,
  seriesByUser,
  chipsByUser,
  chipsMetaByUser,
  // stats arrays
  bestWeeksTop3,
  worstWeeksBottom3,
  topBenchTop3,
}: {
  cumulativeData: Array<Record<string, number>>;
  leagueRankData: Array<Record<string, number>>;
  overallRankData: Array<Record<string, number>>;
  seriesKeys: string[];
  codesByUser: Record<string, string>;
  seriesByUser: SeriesByUser;
  chipsByUser: Record<string, number[]>;
  chipsMetaByUser: Record<string, Record<number, string[]>>;
  bestWeeksTop3: StatItem[];
  worstWeeksBottom3: StatItem[];
  topBenchTop3: StatItem[];
}) {
  const allEvents = cumulativeData.map((d) => d.event as number);
  const maxEvent = allEvents.length ? Math.max(...allEvents) : 1;
  const [selectedWeek, setSelectedWeek] = React.useState<number>(maxEvent);
  const [tab, setTab] = React.useState<"cumulative" | "diff" | "avg" | "ovr rank" | "lg rank" | "wins">("cumulative");

  const getPointsAt = (name: string, gw: number) => {
    const arr = seriesByUser[name] || [];
    const match = arr.find((e) => e.event === gw);
    return match ? match.total_points : NaN;
  };

  const leaderboard = React.useMemo(() => {
    let leaderPoints = -Infinity;
    for (const name of seriesKeys) {
      const p = getPointsAt(name, selectedWeek);
      if (Number.isFinite(p)) leaderPoints = Math.max(leaderPoints, p as number);
    }

    const rows = seriesKeys.map((name) => {
      const code = codesByUser[name]; 
      const ptsNow = getPointsAt(name, selectedWeek);
      const ptsPrev = getPointsAt(name, selectedWeek - 1);
      const deltaGw = (ptsNow ?? 0) - (!Number.isNaN(ptsPrev) ? ptsPrev : 0);

      const diffVsLeader = (leaderPoints ?? 0) - (ptsNow ?? 0);
    
      return { name, code, points: ptsNow, diffVsLeader, deltaGw };
    });

    rows.sort((a, b) =>
      isNaN(b.points) ? -1 : isNaN(a.points) ? 1 : (b.points as number) - (a.points as number)
    );
    return  rows.map((r, i) => {
        const player: PlayerRow = { rank: i + 1, ...r };
        return player;
    });
  }, [seriesKeys, selectedWeek, seriesByUser]);

  const TabButton = ({ id, label }: { id: "cumulative" | "diff" | "avg" | "ovr rank" | "lg rank" | "wins"; label: string }) => {
    const active = tab === id;
    return (
      <button
        onClick={() => setTab(id)}
        className={`px-3 py-2 rounded-md text-sm transition font-semibold
          ${active ? "bg-gray-800 text-white" : "text-gray-300 hover:text-white hover:bg-gray-800/60"}`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
      <div className="md:col-span-2 rounded-2xl bg-gray-900 text-gray-100 py-4 shadow-xl/20">
        <div className="flex items-center justify-between mb-3 px-4">
          <h2 id="leaderboard-title" className="text-slate-100 text-xl font-semibold">
            Leaderboard
          </h2>
          <div className="flex items-center gap-1">
            <button
              className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-sm disabled:opacity-50"
              onClick={() => setSelectedWeek((w) => Math.max(1, w - 1))}
              disabled={selectedWeek <= 1}
            >
              ◀
            </button>
            <div aria-label={`Gameweek ${selectedWeek}`}
             className="rounded-xl bg-slate-800/70 text-slate-200 text-sm px-3 py-1 ring-1 ring-white/10">
                GW {selectedWeek}
            </div>
            <button
              className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-sm disabled:opacity-50"
              onClick={() => setSelectedWeek((w) => Math.min(maxEvent, w + 1))}
              disabled={selectedWeek >= maxEvent}
            >
              ▶
            </button>
          </div>
        </div>

        <Leaderboard players={leaderboard} gameweek={selectedWeek} />

        <p className="mt-3 text-xs text-gray-400">
          Hover or click points in the chart to change the Gameweek here.
        </p>
      </div>

      {/* Right: Tabs + Chart */}
      <div className="md:col-span-4 rounded-2xl bg-gray-900 p-0 shadow-xl/20">
        <div className="p-1 grid grid-cols-3 md:grid-cols-6 ">
          <TabButton id="cumulative" label="Total Points" />
          <TabButton id="diff" label="Diff vs Leader" />
          <TabButton id="avg" label="Total Average % Diff" />
          <TabButton id="ovr rank" label="World Rank" />
          <TabButton id="lg rank" label="League Rank" />
          <TabButton id="wins" label="Most GW Wins" />
        </div>

        {tab === "cumulative" && (
          <InlineClientChart
            data={cumulativeData}
            seriesKeys={seriesKeys}
            selectedWeek={selectedWeek}
            onWeekChange={setSelectedWeek}
            chipsByUser={chipsByUser}
            chipsMetaByUser={chipsMetaByUser}
          />
        )}

        {tab === "diff" && (
          <DiffVsLeaderChart
            seriesByUser={seriesByUser}
            seriesKeys={seriesKeys}
            onWeekChange={setSelectedWeek}
            chipsByUser={chipsByUser}
            chipsMetaByUser={chipsMetaByUser}
          />
        )}

        {tab === "avg" && (
          <VsAverageChart
            seriesByUser={seriesByUser}
            seriesKeys={seriesKeys}
            onWeekChange={setSelectedWeek}
            chipsByUser={chipsByUser}
            chipsMetaByUser={chipsMetaByUser}
          />
        )}

        {tab === "ovr rank" && (
          <OverallRankChart
            rankData={overallRankData}
            seriesKeys={seriesKeys}
            onWeekChange={setSelectedWeek}
            chipsByUser={chipsByUser}
            chipsMetaByUser={chipsMetaByUser}
          />
        )}

        {tab === "lg rank" && (
          <OverallRankChart
            rankData={leagueRankData}
            seriesKeys={seriesKeys}
            onWeekChange={setSelectedWeek}
            chipsByUser={chipsByUser}
            chipsMetaByUser={chipsMetaByUser}
          />
        )}
         {tab === "wins" && (
          <FirstPlaceWinsChart
            seriesByUser={seriesByUser}
            seriesKeys={seriesKeys}
            codesByUser={codesByUser}
            // use your existing colorFor(nameOrCode).hex for rock-steady colors
            colorForKey={(key) => (colorFor ? colorFor(key) : { hex: "#6EA8FE" })}
          />
        )}
      </div>
      <StatsCard bestWeeks={bestWeeksTop3} worstWeeks={worstWeeksBottom3} topBench={topBenchTop3} />
    </div>
  );
}
