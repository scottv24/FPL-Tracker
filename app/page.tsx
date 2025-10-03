// app/page.tsx (Server Component)
import React from "react";
import LeaderboardWithChart from "./components/LeaderboardWithChart";

type User = { name: string; code: string };

const Users: User[] = [
  { name: "Scott",   code: "2408847" },
  { name: "Ross",    code: "7707025" },
  { name: "Douglas", code: "688541"  },
  { name: "Jake",    code: "541241"  },
];

type CurrentEvent = {
  event: number;
  points: number;
  total_points: number;
  rank: number;
  overall_rank: number;
  value: number;
};

type Chip = { name: string; time: string; event: number };

interface FplHistoryResponse {
  current: CurrentEvent[];
  chips?: Chip[];
}

// total_points rows
function mergeByEvent(seriesMap: Record<string, CurrentEvent[]>): Array<Record<string, number>> {
  const allEvents = new Set<number>();
  Object.values(seriesMap).forEach(arr => arr.forEach(e => allEvents.add(e.event)));
  const sorted = Array.from(allEvents).sort((a, b) => a - b);
  return sorted.map((gw) => {
    const row: Record<string, number> = { event: gw } as any;
    for (const [seriesKey, arr] of Object.entries(seriesMap)) {
      const match = arr.find(e => e.event === gw);
      row[seriesKey] = match ? match.total_points : NaN;
    }
    return row;
  });
}

// overall_rank rows
function mergeRankByEvent(seriesMap: Record<string, CurrentEvent[]>): Array<Record<string, number>> {
  const allEvents = new Set<number>();
  Object.values(seriesMap).forEach(arr => arr.forEach(e => allEvents.add(e.event)));
  const sorted = Array.from(allEvents).sort((a, b) => a - b);
  return sorted.map((gw) => {
    const row: Record<string, number> = { event: gw } as any;
    for (const [seriesKey, arr] of Object.entries(seriesMap)) {
      const match = arr.find(e => e.event === gw);
      row[seriesKey] = match ? match.overall_rank : NaN;
    }
    return row;
  });
}

export default async function Page() {
  const results = await Promise.all(
    Users.map(async (user) => {
      const url = `https://fantasy.premierleague.com/api/entry/${user.code}/history/`;
      const res = await fetch(url, { next: { revalidate: 60 } });
      if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
      const json = (await res.json()) as FplHistoryResponse;
      return { user, json };
    })
  );

  const seriesMap: Record<string, CurrentEvent[]> = {};
  const chipsByUser: Record<string, number[]> = {};
  const chipsMetaByUser: Record<string, Record<number, string[]>> = {};

  for (const { user, json } of results) {
    seriesMap[user.name] = json.current;

    const chips = json.chips ?? [];
    chipsByUser[user.name] = chips.map(c => c.event);

    const meta: Record<number, string[]> = {};
    for (const c of chips) {
      if (!meta[c.event]) meta[c.event] = [];
      meta[c.event].push(c.name);
    }
    chipsMetaByUser[user.name] = meta;
  }

  const cumulativeData = mergeByEvent(seriesMap);
  const rankData = mergeRankByEvent(seriesMap); // ⬅️ NEW
  const seriesKeys = Object.keys(seriesMap);

  const seriesByUser: Record<string, { event: number; total_points: number }[]> = {};
  Object.entries(seriesMap).forEach(([name, arr]) => {
    seriesByUser[name] = arr.map(({ event, total_points }) => ({ event, total_points }));
  });

  return (
    <main className="min-h-screen bg-gray-800 text-gray-100 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Speak of the Neville Tracker</h1>
            <p className="text-sm text-gray-300">
              Hover the chart to sync toggle the leaderboard.
            </p>
          </div>
        </header>

        <LeaderboardWithChart
          cumulativeData={cumulativeData}
          rankData={rankData}            
          seriesKeys={seriesKeys}
          seriesByUser={seriesByUser}
          chipsByUser={chipsByUser}
          chipsMetaByUser={chipsMetaByUser}
        />
      </div>
    </main>
  );
}
