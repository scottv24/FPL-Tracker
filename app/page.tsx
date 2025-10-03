// app/page.tsx
import React from "react";
import { unstable_noStore as noStore } from "next/cache";
import LeaderboardWithChart from "./components/LeaderboardWithChart";

// ✅ make this route dynamic (don’t prerender at build)
export const dynamic = "force-dynamic";

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

// ----- helpers ---------------------------------------------------------------

async function fetchWithRetry<T>(
  url: string,
  { retries = 2, backoffMs = 600 }: { retries?: number; backoffMs?: number } = {}
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      // noStore + no-store => never cached/prerendered at build
      const res = await fetch(url, { cache: "no-store" });
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
      if (i < retries) {
        await new Promise((r) => setTimeout(r, backoffMs * Math.pow(2, i)));
        continue;
      }
    }
  }
  throw lastErr;
}

// rows: [{ event, Scott: total_points, ... }]
function mergeByEvent(seriesMap: Record<string, CurrentEvent[]>): Array<Record<string, number>> {
  const allEvents = new Set<number>();
  Object.values(seriesMap).forEach((arr) => arr.forEach((e) => allEvents.add(e.event)));
  const sorted = Array.from(allEvents).sort((a, b) => a - b);
  return sorted.map((gw) => {
    const row: Record<string, number> = { event: gw } as any;
    for (const [seriesKey, arr] of Object.entries(seriesMap)) {
      const match = arr.find((e) => e.event === gw);
      row[seriesKey] = match ? match.total_points : NaN;
    }
    return row;
  });
}

// rows: [{ event, Scott: overall_rank, ... }]
function mergeRankByEvent(seriesMap: Record<string, CurrentEvent[]>): Array<Record<string, number>> {
  const allEvents = new Set<number>();
  Object.values(seriesMap).forEach((arr) => arr.forEach((e) => allEvents.add(e.event)));
  const sorted = Array.from(allEvents).sort((a, b) => a - b);
  return sorted.map((gw) => {
    const row: Record<string, number> = { event: gw } as any;
    for (const [seriesKey, arr] of Object.entries(seriesMap)) {
      const match = arr.find((e) => e.event === gw);
      row[seriesKey] = match ? match.overall_rank : NaN;
    }
    return row;
  });
}

// ----- page -----------------------------------------------------------------

export default async function Page() {
  // also tell Next not to cache this request at all
  noStore();

  // Fetch each user; do not throw if one fails
  const results = await Promise.all(
    Users.map(async (user) => {
      const url = `https://fantasy.premierleague.com/api/entry/${user.code}/history/`;
      try {
        const json = await fetchWithRetry<FplHistoryResponse>(url, { retries: 2 });
        return { user, json, ok: true as const };
      } catch (err) {
        console.error(`Failed to fetch ${url}:`, err);
        return { user, json: null, ok: false as const, err };
      }
    })
  );

  // Build maps from successful fetches only
  const seriesMap: Record<string, CurrentEvent[]> = {};
  const chipsByUser: Record<string, number[]> = {};
  const chipsMetaByUser: Record<string, Record<number, string[]>> = {};
  const failures: string[] = [];

  for (const r of results) {
    if (r.ok && r.json) {
      const { user, json } = r;
      seriesMap[user.name] = json.current;

      const chips = json.chips ?? [];
      chipsByUser[user.name] = chips.map((c) => c.event);

      const meta: Record<number, string[]> = {};
      for (const c of chips) {
        if (!meta[c.event]) meta[c.event] = [];
        meta[c.event].push(c.name);
      }
      chipsMetaByUser[user.name] = meta;
    } else {
      failures.push(r.user.name);
    }
  }

  // Derive data for charts
  const cumulativeData = mergeByEvent(seriesMap);
  const rankData = mergeRankByEvent(seriesMap);
  const seriesKeys = Object.keys(seriesMap);

  // per-user arrays for other charts / leaderboard
  const seriesByUser: Record<string, { event: number; total_points: number }[]> = {};
  Object.entries(seriesMap).forEach(([name, arr]) => {
    seriesByUser[name] = arr.map(({ event, total_points }) => ({ event, total_points }));
  });

  const codesByUser: Record<string, string> = Object.fromEntries(
  Users.map(u => [u.name, u.code])
);

  return (
    <main className="min-h-screen bg-gray-800 text-gray-100 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Speak of the Neville Tracker</h1>
            <p className="text-sm text-gray-300">
              Hover or click the chart to sync the leaderboard.
            </p>
          </div>
        </header>

        {/* Soft warning if any entries failed to load */}
        
        {failures.length > 0 ? (
                  <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 text-yellow-200 px-3 py-2 text-md">
                    The FPL website is being updated so stats are not available. Try again later.
                  </div>
        ) :
        <LeaderboardWithChart
          cumulativeData={cumulativeData}
          rankData={rankData}
          seriesKeys={seriesKeys}
          seriesByUser={seriesByUser}
          codesByUser={codesByUser}
          chipsByUser={chipsByUser}
          chipsMetaByUser={chipsMetaByUser}
        />
      }
      </div>
    </main>
  );
}
