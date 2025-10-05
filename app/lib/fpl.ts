// app/lib/fpl.ts
export type User = { name: string; code: string };

export type PlayerRow = {
  name: string;            // "Scott"
  points: number;          // 402
  diffVsLeader: number;    // 0, 66, ...
  deltaGw: number;         // +44, +32, ...
  bestGw?: boolean;
  rank: number;
  code?: string;
  event?: number;
};

export const Users: User[] = [
  { name: "Scott",   code: "2408847" },
  { name: "Ross",    code: "7707025" },
  { name: "Douglas", code: "688541"  },
  { name: "Jake",    code: "541241"  },
];

// -------------------- types for API history + payload --------------------

export type CurrentEvent = {
  event: number;
  points: number;             // GW points (denominator for bench %)
  total_points: number;       // cumulative after this GW
  rank: number;
  overall_rank: number;
  value: number;
  points_on_bench?: number;   // provided by FPL history API
}

export type Chip = { name: string; time: string; event: number };

export interface FplHistoryResponse {
  current: CurrentEvent[];
  chips?: Chip[];
}

export interface FplPayload {
  cumulativeData: Array<Record<string, number>>;
  overallRankData: Array<Record<string, number>>;
  leagueRankData: Array<Record<string, number>>;
  seriesKeys: string[];
  seriesByUser: Record<string, { event: number; total_points: number }[]>;
  chipsByUser: Record<string, number[]>;
  chipsMetaByUser: Record<string, Record<number, string[]>>;
  codesByUser: Record<string, string>;
  failures: string[];
  // Stats (now include code)
  bestWeeksTop3: { name: string; code: string; event: number; value: number }[];
  worstWeeksBottom3: { name: string; code: string; event: number; value: number }[];
  topBenchTop3: { name: string; code: string; event: number; value: number }[]; // value is PERCENT
}

// -------------------- shared fetch bits --------------------

const browserLikeHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-GB,en;q=0.9",
  "Referer": "https://fantasy.premierleague.com/",
  "Origin": "https://fantasy.premierleague.com",
  "Cache-Control": "no-cache",
} as const;

class HttpError extends Error {
  status: number;
  url: string;
  headers: Record<string, string>;
  bodyPreview: string;
  constructor(params: {
    message: string;
    status: number;
    url: string;
    headers: Headers;
    body: string;
  }) {
    super(params.message);
    this.name = "HttpError";
    this.status = params.status;
    this.url = params.url;
    this.headers = Object.fromEntries(params.headers.entries());
    this.bodyPreview = params.body.slice(0, 300);
  }
}

async function fetchDedup<T>(url: string, init?: RequestInit): Promise<T> {
  let lastErr: unknown = null;
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { ...browserLikeHeaders, ...(init?.headers ?? {}) },
      });
      if (!res.ok) {
        let body = "";
        try { body = await res.text(); } catch {}
        throw new HttpError({
          message: `HTTP ${res.status} ${res.statusText} for ${url}`,
          status: res.status,
          url,
          headers: res.headers,
          body,
        });
      }
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
      await new Promise(r => setTimeout(r, 300 + Math.random() * 300));
    }
  }
  throw lastErr;
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const q = items.slice();
  const res: R[] = [];
  const workers = Array.from({ length: Math.min(limit, items.length) }).map(async () => {
    while (q.length) {
      const item = q.shift()!;
      await new Promise(r => setTimeout(r, 200 + Math.random() * 400));
      res.push(await fn(item));
    }
  });
  await Promise.all(workers);
  return res;
}

// -------------------- merge helpers --------------------

function mergeByEvent(seriesMap: Record<string, CurrentEvent[]>): Array<Record<string, number>> {
  const allEvents = new Set<number>();
  Object.values(seriesMap).forEach(arr => arr.forEach(e => allEvents.add(e.event)));
  const sorted = [...allEvents].sort((a, b) => a - b);
  return sorted.map(gw => {
    const row: Record<string, number> = { event: gw } as any;
    for (const [name, arr] of Object.entries(seriesMap)) {
      const hit = arr.find(e => e.event === gw);
      row[name] = hit ? hit.total_points : Number.NaN;
    }
    return row;
  });
}

function mergeOverallRankByEvent(seriesMap: Record<string, CurrentEvent[]>): Array<Record<string, number>> {
  const allEvents = new Set<number>();
  Object.values(seriesMap).forEach(arr => arr.forEach(e => allEvents.add(e.event)));
  const sorted = [...allEvents].sort((a, b) => a - b);
  return sorted.map(gw => {
    const row: Record<string, number> = { event: gw } as any;
    for (const [name, arr] of Object.entries(seriesMap)) {
      const hit = arr.find(e => e.event === gw);
      row[name] = hit ? hit.overall_rank : Number.NaN;
    }
    return row;
  });
}

function mergeLeagueRankByEvent(seriesMap: Record<string, CurrentEvent[]>): Array<Record<string, number>> {
  const allEvents = new Set<number>();
  Object.values(seriesMap).forEach(arr => arr.forEach(e => allEvents.add(e.event)));
  const sortedEvents = [...allEvents].sort((a, b) => a - b);
  const names = Object.keys(seriesMap);

  return sortedEvents.map(eventId => {
    const entries = names.map(name => {
      const ev = seriesMap[name]?.find(e => e.event === eventId);
      return { name, points: ev?.total_points };
    });

    const withData = entries.filter(e => Number.isFinite(e.points)) as Array<{ name: string; points: number }>;
    withData.sort((a, b) => b.points - a.points);

    const placement = new Map<string, number>();
    let lastPoints: number | null = null;
    let lastPlace = 0;

    withData.forEach((row, i) => {
      if (lastPoints === null || row.points !== lastPoints) {
        lastPlace = i + 1;
        lastPoints = row.points;
      }
      placement.set(row.name, lastPlace);
    });

    const row: Record<string, number> = { event: eventId } as any;
    names.forEach(name => {
      row[name] = placement.get(name) ?? Number.NaN;
    });
    return row;
  });
}

// -------------------- live points override --------------------

type EventLiveResponse = {
  elements: Array<{
    id: number;
    stats: { minutes: number; total_points: number };
  }>;
};

type PicksResponse = {
  active_chip: string | null;
  automatic_subs: Array<any>;
  entry_history: {
    event: number;
    points: number;
    total_points: number;
    rank: number;
    overall_rank: number;
    bank: number;
    value: number;
  };
  picks: Array<{
    element: number;
    position: number;
    multiplier: number;
    is_captain: boolean;
    is_vice_captain: boolean;
    element_type: number;
  }>;
};

function looksLive(live: EventLiveResponse | null | undefined): boolean {
  if (!live || !Array.isArray(live.elements)) return false;
  return live.elements.some(el => (el.stats.minutes ?? 0) > 0 || (el.stats.total_points ?? 0) !== 0);
}

function buildPointsMap(live: EventLiveResponse): Map<number, number> {
  const m = new Map<number, number>();
  for (const el of live.elements) m.set(el.id, el.stats.total_points ?? 0);
  return m;
}

function sumLivePointsForPicks(live: EventLiveResponse, picks: PicksResponse["picks"]): number {
  const m = buildPointsMap(live);
  let total = 0;
  for (const p of picks) {
    const pts = m.get(p.element) ?? 0;
    const mult = p.multiplier;
    total += pts * mult;
  }
  return total;
}

async function applyLiveOverrideIfAny(seriesMap: Record<string, CurrentEvent[]>) {
  const latestEvent = Math.max(
    ...Object.values(seriesMap).flat().map((e) => e.event),
    0
  );
  if (!Number.isFinite(latestEvent) || latestEvent <= 0) return;

  let live: EventLiveResponse | null = null;
  try {
    live = await fetchDedup<EventLiveResponse>(
      `https://fantasy.premierleague.com/api/event/${latestEvent}/live/`,
      { headers: browserLikeHeaders }
    );
  } catch {
    return;
  }
  if (!looksLive(live)) return;

  await mapLimit(Users, 2, async (u) => {
    const arr = seriesMap[u.name];
    if (!arr) return;
    try {
      const picks = await fetchDedup<PicksResponse>(
        `https://fantasy.premierleague.com/api/entry/${u.code}/event/${latestEvent}/picks/`,
        { headers: browserLikeHeaders }
      );
      const livePoints = sumLivePointsForPicks(live as EventLiveResponse, picks.picks);
      const prevTotal = arr.find(e => e.event === latestEvent - 1)?.total_points ?? 0;

      const existing = arr.find(e => e.event === latestEvent);
      if (existing) {
        existing.points = livePoints;
        existing.total_points = prevTotal + livePoints;
      } else {
        arr.push({
          event: latestEvent,
          points: livePoints,
          total_points: prevTotal + livePoints,
          rank: Number.NaN as number,
          overall_rank: Number.NaN as number,
          value: Number.NaN as number,
        });
      }
    } catch {
      // swallow live override errors per-user
    }
  });
}

// -------------------- fixtures query for "worst leaderboard" rule --------------------

type Fixture = { finished: boolean };

/**
 * Returns true if the latest event has any fixture not finished.
 * If fetching fails for any reason, returns false (i.e., do not exclude).
 */
async function latestEventHasUnfinishedFixture(latestEvent: number): Promise<boolean> {
  if (!Number.isFinite(latestEvent) || latestEvent <= 0) return false;
  try {
    const fixtures = await fetchDedup<Fixture[]>(
      `https://fantasy.premierleague.com/api/fixtures/?event=${latestEvent}`,
      { headers: browserLikeHeaders }
    );
    return Array.isArray(fixtures) && fixtures.some(f => f && (f.finished === false));
  } catch {
    // On error, fail open (do not exclude).
    return false;
  }
}

// -------------------- main builder --------------------

export async function buildFplPayload(): Promise<FplPayload> {
  // Histories
  const results = await mapLimit(Users, 2, async (user) => {
    const url = `https://fantasy.premierleague.com/api/entry/${user.code}/history/`;
    try {
      const json = await fetchDedup<FplHistoryResponse>(url, {
        headers: browserLikeHeaders,
      });
      return { user, json, ok: true as const };
    } catch (err) {
      console.error(`FPL fetch failed for ${user.name}`, err);
      return { user, json: null, ok: false as const };
    }
  });

  const codeByName: Record<string, string> = Object.fromEntries(Users.map(u => [u.name, u.code]));
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
      for (const c of chips) (meta[c.event] ||= []).push(c.name);
      chipsMetaByUser[user.name] = meta;
    } else {
      failures.push(r.user.name);
    }
  }

  // Live override (mutates seriesMap).
  try {
    await applyLiveOverrideIfAny(seriesMap);
  } catch (e) {
    console.warn("Live override failed:", e);
  }

  // ----- league records (best/worst weeks and top bench %), now include code -----
  const allWeeks: { name: string; code: string; event: number; value: number }[] = [];
  const allBenchPct: { name: string; code: string; event: number; value: number }[] = [];

  for (const [name, events] of Object.entries(seriesMap)) {
    const code = codeByName[name];
    for (const e of events) {
      // for best/worst based on GW points
      if (Number.isFinite(e.points)) {
        allWeeks.push({ name, code, event: e.event, value: e.points });
      }
      // for bench percentage
      const bench = e.points_on_bench;
      if (Number.isFinite(bench) && Number.isFinite(e.points) && (e.points as number) > 0) {
        // value = (bench / GW points) * 100, rounded to 1 decimal
        const pct = Math.round((bench as number) / (e.points as number) * 1000) / 10;
        allBenchPct.push({ name, code, event: e.event, value: pct });
      }
    }
  }

  // Determine latest event across the league
  const latestEvent = Math.max(0, ...Object.values(seriesMap).flat().map(e => e.event));

  // Should we exclude the latest event from the WORST leaderboard?
  const excludeLatestFromWorst = await latestEventHasUnfinishedFixture(latestEvent);

  // best: unaffected
  const bestWeeksTop3 = [...allWeeks].sort((a, b) => b.value - a.value).slice(0, 3);

  // worst: exclude latest event iff any fixture for that event is unfinished
  const worstCandidatePool = excludeLatestFromWorst
    ? allWeeks.filter(w => w.event !== latestEvent)
    : allWeeks;
  const worstWeeksBottom3 = [...worstCandidatePool].sort((a, b) => a.value - b.value).slice(0, 3);

  // bench %: rank by percentage desc
  const topBenchTop3 = [...allBenchPct].sort((a, b) => b.value - a.value).slice(0, 3);

  // ----- build chart series -----
  const cumulativeData  = mergeByEvent(seriesMap);
  const overallRankData = mergeOverallRankByEvent(seriesMap);
  const leagueRankData  = mergeLeagueRankByEvent(seriesMap);
  const seriesKeys      = Object.keys(seriesMap);

  const seriesByUser: Record<string, { event: number; total_points: number }[]> = {};
  Object.entries(seriesMap).forEach(([name, arr]) => {
    seriesByUser[name] = arr.map(({ event, total_points }) => ({ event, total_points }));
  });

  const codesByUser = Object.fromEntries(Users.map(u => [u.name, u.code]));

  return {
    cumulativeData,
    overallRankData,
    leagueRankData,
    seriesKeys,
    seriesByUser,
    chipsByUser,
    chipsMetaByUser,
    codesByUser,
    failures,
    bestWeeksTop3,
    worstWeeksBottom3,
    topBenchTop3, // percentage values
  };
}
