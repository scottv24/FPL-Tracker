// app/lib/fpl.ts
export type User = { name: string; code: string };

export type PlayerRow = {
  name: string;            // "Scott"
  points: number;          // 402
  diffVsLeader: number;    // 0, 66, ...
  deltaGw: number;         // +44, +32, ...
  bestGw?: boolean;      
  rank: number;
};

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
  overallRankData: Array<Record<string, number>>;
  leagueRankData: Array<Record<string, number>>;
  seriesKeys: string[];
  seriesByUser: Record<string, { event: number; total_points: number }[]>;
  chipsByUser: Record<string, number[]>;
  chipsMetaByUser: Record<string, Record<number, string[]>>;
  codesByUser: Record<string, string>;
  failures: string[];
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
    this.bodyPreview = params.body.slice(0, 2_000);
  }
}

export async function fetchWithRetry<T>(
  url: string,
  {
    retries = 2,
    backoffMs = 600,
    init,
  }: { retries?: number; backoffMs?: number; init?: RequestInit } = {}
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        // Allow Next.js to memoize when we want (we'll pass next: { revalidate } per call)
        headers: { ...browserLikeHeaders, ...(init?.headers ?? {}) },
        ...init,
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
    } catch (err: any) {
      lastErr = err;
      console.error("Fetch failed", {
        url,
        tryIndex: i,
        name: err?.name,
        message: String(err?.message ?? err),
        status: err?.status,
        headers: err?.headers,
        bodyPreview: err?.bodyPreview,
      });
      if (i < retries) {
        const jitter = Math.random() * 250;
        await new Promise(r => setTimeout(r, backoffMs * Math.pow(2, i) + jitter));
        continue;
      }
    }
  }
  throw lastErr;
}

// Deduplicate identical in-flight requests across the same render/request
const inflight = new Map<string, Promise<any>>();
async function fetchDedup<T>(url: string, init?: RequestInit): Promise<T> {
  const key = `${url}|${JSON.stringify(init ?? {})}`;
  if (inflight.has(key)) return inflight.get(key)! as Promise<T>;
  const p = fetchWithRetry<T>(url, { init }).finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

// Tiny concurrency limiter
async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const res: R[] = [];
  const q = items.slice();
  const workers = Array.from({ length: Math.min(limit, items.length) }).map(async () => {
    while (q.length) {
      const item = q.shift()!;
      // jitter to smooth bursts
      await new Promise(r => setTimeout(r, 200 + Math.random() * 400));
      res.push(await fn(item));
    }
  });
  await Promise.all(workers);
  return res;
}

// -------------------- merge helpers (unchanged) --------------------

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

function mergeOverallRankByEvent(seriesMap: Record<string, CurrentEvent[]>): Array<Record<string, number>> {
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

    withData.forEach((e, idx) => {
      if (lastPoints === null || e.points !== lastPoints) {
        lastPlace = idx + 1;
        lastPoints = e.points;
      }
      placement.set(e.name, lastPlace);
    });

    const row: Record<string, number> = { event: eventId } as any;
    names.forEach(name => {
      row[name] = placement.has(name) ? (placement.get(name) as number) : NaN;
    });
    return row;
  });
}

// -------------------- live GW logic --------------------

type EventLiveElement = {
  id: number;
  stats: { total_points: number; minutes?: number };
};

type EventLiveResponse = { elements: EventLiveElement[] };

type PicksResponse = {
  entry_history: { event: number };
  picks: Array<{
    element: number;
    multiplier: number;
    position: number;
    is_captain: boolean;
    is_vice_captain: boolean;
    element_type: number;
  }>;
  active_chip?: string | null;
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
  const map = buildPointsMap(live);
  let sum = 0;
  for (const p of picks) {
    const viaMap = map.get(p.element);
    const viaIndex = live.elements[p.element - 1]?.stats?.total_points;
    const pts = (viaMap ?? viaIndex ?? 0) * (p.multiplier ?? 1);
    sum += pts;
  }
  return sum;
}

/** Mutates seriesMap to override the latest GW with live values.
 *  Uses dedup + concurrency limit to avoid bursts.
 */
async function applyLiveOverrideIfAny(seriesMap: Record<string, CurrentEvent[]>): Promise<void> {
  const names = Object.keys(seriesMap);
  if (names.length === 0) return;

  const latestEvent = Math.max(
    ...names.map(n => {
      const arr = seriesMap[n] ?? [];
      return arr.length ? Math.max(...arr.map(e => e.event)) : 0;
    })
  );
  if (!Number.isFinite(latestEvent) || latestEvent <= 0) return;

  let live: EventLiveResponse | null = null;
  try {
    // live endpoint: don't disable caching entirely, just no-store for safety
    live = await fetchWithRetry<EventLiveResponse>(
      `https://fantasy.premierleague.com/api/event/${latestEvent}/live/`,
      { init: { cache: "no-store", headers: browserLikeHeaders } }
    );
  } catch {
    return;
  }
  if (!looksLive(live)) return;

  // Limit picks calls to 2 at a time
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
        arr.sort((a, b) => a.event - b.event);
      }
    } catch {
      // ignore
    }
  });
}

// -------------------- main builder --------------------

export async function buildFplPayload(): Promise<FplPayload> {
  // Histories: cacheable + dedup + limited concurrency
  const results = await mapLimit(Users, 2, async (user) => {
    const url = `https://fantasy.premierleague.com/api/entry/${user.code}/history/`;
    try {
      const json = await fetchDedup<FplHistoryResponse>(url, {
        // give Next a memoization window (revalidate) via route/page callers
        headers: browserLikeHeaders,
        // DO NOT set { cache: "no-store" } here — let Next cache/memoize upstream
      });
      return { user, json, ok: true as const };
    } catch (err) {
      console.error(`FPL fetch failed for ${user.name}`, err);
      return { user, json: null, ok: false as const };
    }
  });

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

  // Apply live override (mutates seriesMap)
  try {
    await applyLiveOverrideIfAny(seriesMap);
  } catch (e) {
    console.warn("Live override failed:", e);
  }

  const cumulativeData   = mergeByEvent(seriesMap);
  const overallRankData  = mergeOverallRankByEvent(seriesMap);
  const leagueRankData   = mergeLeagueRankByEvent(seriesMap);
  const seriesKeys       = Object.keys(seriesMap);

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
  };
}
