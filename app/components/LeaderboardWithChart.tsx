// app/components/LeaderboardWithChart.tsx
"use client";

import React from "react";
import InlineClientChart from "./InlineClientChart";
import DiffVsLeaderChart from "./DiffVsLeaderChart";
import VsAverageChart from "./VsAverageChart";
import OverallRankChart from "./OverallRankChart";
import { colorForSeries, hsla } from "./colors";

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
}: {
  cumulativeData: Array<Record<string, number>>;
  leagueRankData: Array<Record<string, number>>;
  overallRankData: Array<Record<string, number>>;
  seriesKeys: string[];
  codesByUser: Record<string, string>;
  seriesByUser: SeriesByUser;
  chipsByUser: Record<string, number[]>;
  chipsMetaByUser: Record<string, Record<number, string[]>>;
}) {
  const allEvents = cumulativeData.map((d) => d.event as number);
  const maxEvent = allEvents.length ? Math.max(...allEvents) : 1;
  const [selectedWeek, setSelectedWeek] = React.useState<number>(maxEvent);
  const [tab, setTab] = React.useState<"cumulative" | "diff" | "avg" | "ovr rank" | "lg rank">("cumulative");

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
      const ptsNow = getPointsAt(name, selectedWeek);
      const ptsPrev = getPointsAt(name, selectedWeek - 1);
      const delta =
        Number.isFinite(ptsNow) && Number.isFinite(ptsPrev) ? (ptsNow as number) - (ptsPrev as number) : undefined;

      const behind =
        Number.isFinite(ptsNow) && Number.isFinite(leaderPoints)
          ? (leaderPoints as number) - (ptsNow as number)
          : undefined;

      return { name, points: ptsNow, behind, delta };
    });

    rows.sort((a, b) =>
      isNaN(b.points) ? -1 : isNaN(a.points) ? 1 : (b.points as number) - (a.points as number)
    );
    return rows.map((r, i) => ({ rank: i + 1, ...r }));
  }, [seriesKeys, selectedWeek, seriesByUser]);

  const TabButton = ({ id, label }: { id: "cumulative" | "diff" | "avg" | "ovr rank" | "lg rank"; label: string }) => {
    const active = tab === id;
    return (
      <button
        onClick={() => setTab(id)}
        className={`px-3 py-1 rounded-md text-sm transition
          ${active ? "bg-gray-800 text-white" : "text-gray-300 hover:text-white hover:bg-gray-800/60"}`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
      {/* Left: Leaderboard */}
      <div className="md:col-span-2 rounded-2xl bg-gray-900 text-gray-100 py-4">
        <div className="flex items-center justify-between mb-3 px-4">
          <h3 className="text-lg font-semibold">Leaderboard</h3>
          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-sm disabled:opacity-50"
              onClick={() => setSelectedWeek((w) => Math.max(1, w - 1))}
              disabled={selectedWeek <= 1}
            >
              ◀
            </button>
            <span className="text-sm tabular-nums">GW {selectedWeek}</span>
            <button
              className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-sm disabled:opacity-50"
              onClick={() => setSelectedWeek((w) => Math.min(maxEvent, w + 1))}
              disabled={selectedWeek >= maxEvent}
            >
              ▶
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-400">
              <tr>
                <th className="py-2 pl-4">#</th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3 text-right">Points</th>
                <th className="py-2 pr-3 text-right">Diff</th>
                <th className="py-2 pr-4 text-right">Δ GW</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map(({ rank, name, points, behind, delta }) => {
                const color = colorForSeries(name, seriesKeys);
                const bg = hsla(color, 0.10); // subtle 10% tint
                return (
                  <tr
                    key={name}
                    className="border-t border-gray-800"
                    style={{ backgroundColor: bg }}
                    onClick={() => window.open(`https://fantasy.premierleague.com/entry/${codesByUser[name]}/event/${selectedWeek}`, '_blank')}
                  >
                    <td className="py-4 pl-2">{rank}</td>
                    <td className="py-2 pr-3">
                      <span
                        className="inline-block h-2 w-2 rounded-full mr-2 align-middle"
                        style={{ background: color }}
                        aria-hidden
                      />
                      <span className="align-middle">{name}</span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {Number.isFinite(points) ? points : "—"}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {behind === undefined ? "—" : behind}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {delta === undefined ? "—" : (delta >= 0 ? `+${delta}` : `${delta}`)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-gray-400">
          Hover or click points in the chart to change the Gameweek here.
        </p>
      </div>

      {/* Right: Tabs + Chart */}
      <div className="md:col-span-4 rounded-2xl bg-gray-900 p-4">
        <div className="mb-3 grid grid-cols-3 md:grid-cols-6">
          <TabButton id="cumulative" label="Total Points" />
          <TabButton id="diff" label="Diff vs Leader" />
          <TabButton id="avg" label="Total Average % Diff" />
          <TabButton id="ovr rank" label="World Rank" />
          <TabButton id="lg rank" label="League Rank" />
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
      </div>
    </div>
  );
}
