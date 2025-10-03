// app/lib/fpl.ts
export type User = { name: string; code: string };

export const Users: User[] = [
  { name: "Scott",   code: "2408847" },
  { name: "Ross",    code: "7707025" },
  { name: "Douglas", code: "688541"  },
  { name: "Jake",    code: "541241"  },
];

export type CurrentEvent = {
  event: number;
  points: number;
  total_points: number;
  rank: number;
  overall_rank: number;
  value: number;
};

export type Chip = { name: string; time: string; event: number };

export interface FplHistoryResponse {
  current: CurrentEvent[];
  chips?: Chip[];
}

export interface FplPayload {
  cumulativeData: Array<Record<string, number>>;
  rankData: Array<Record<string, number>>;
  seriesKeys: string[];
  seriesByUser: Record<string, { event: number; total_points: number }[]>;
  chipsByUser: Record<string, number[]>;
  chipsMetaByUser: Record<string, Record<number, string[]>>;
  codesByUser: Record<string, string>;
  failures: string[];
}

export async function fetchWithRetry<T>(
  url: string,
  { retries = 2, backoffMs = 600 }: { retries?: number; backoffMs?: number } = {}
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) console.error(res.status);
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
      if (i < retries) await new Promise(r => setTimeout(r, backoffMs * Math.pow(2, i)));
    }
  }
  throw lastErr;
}

function mergeByEvent(seriesMap: Record<string, CurrentEvent[]>): Array<Record<string, number>> {
  const allEvents = new Set<number>();
  Object.values(seriesMap).forEach(arr => arr.forEach(e => allEvents.add(e.event)));
  const sorted = [...allEvents].sort((a, b) => a - b);
  return sorted.map(gw => {
    const row: Record<string, number> = { event: gw } as any;
    for (const [name, arr] of Object.entries(seriesMap)) {
      const hit = arr.find(e => e.event === gw);
      row[name] = hit ? hit.total_points : NaN;
    }
    return row;
  });
}

function mergeRankByEvent(seriesMap: Record<string, CurrentEvent[]>): Array<Record<string, number>> {
  const allEvents = new Set<number>();
  Object.values(seriesMap).forEach(arr => arr.forEach(e => allEvents.add(e.event)));
  const sorted = [...allEvents].sort((a, b) => a - b);
  return sorted.map(gw => {
    const row: Record<string, number> = { event: gw } as any;
    for (const [name, arr] of Object.entries(seriesMap)) {
      const hit = arr.find(e => e.event === gw);
      row[name] = hit ? hit.overall_rank : NaN;
    }
    return row;
  });
}

export async function buildFplPayload(): Promise<FplPayload> {
  const results = await Promise.all(
    Users.map(async (user) => {
      const url = `https://fantasy.premierleague.com/api/entry/${user.code}/history/`;
      try {
        const json = await fetchWithRetry<FplHistoryResponse>(url);
        return { user, json, ok: true as const };
      } catch (err) {
        console.error(`FPL fetch failed for ${user.name}`, err);
        return { user, json: null, ok: false as const };
      }
    })
  );

  const seriesMap: Record<string, CurrentEvent[]> = {};
  const chipsByUser: Record<string, number[]> = {};
  const chipsMetaByUser: Record<string, Record<number, string[]>> = {};
  const failures: string[] = [];

  for (const r of results) {
    if (r.ok && r.json) {
      const { user, json } = r;
      seriesMap[user.name] = json.current;
      const chips = json.chips ?? [];
      chipsByUser[user.name] = chips.map(c => c.event);
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

  const cumulativeData = mergeByEvent(seriesMap);
  const rankData = mergeRankByEvent(seriesMap);
  const seriesKeys = Object.keys(seriesMap);

  const seriesByUser: Record<string, { event: number; total_points: number }[]> = {};
  Object.entries(seriesMap).forEach(([name, arr]) => {
    seriesByUser[name] = arr.map(({ event, total_points }) => ({ event, total_points }));
  });

  const codesByUser = Object.fromEntries(Users.map(u => [u.name, u.code]));

  return {
    cumulativeData,
    rankData,
    seriesKeys,
    seriesByUser,
    chipsByUser,
    chipsMetaByUser,
    codesByUser,
    failures,
  };
}
