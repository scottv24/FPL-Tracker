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
  overallRankData: Array<Record<string, number>>;
  leagueRankData: Array<Record<string, number>>;
  seriesKeys: string[];
  seriesByUser: Record<string, { event: number; total_points: number }[]>;
  chipsByUser: Record<string, number[]>;
  chipsMetaByUser: Record<string, Record<number, string[]>>;
  codesByUser: Record<string, string>;
  failures: string[];
}

// -------------------- fetch helper --------------------

export async function fetchWithRetry<T>(
  url: string,
  { retries = 2, backoffMs = 600 }: { retries?: number; backoffMs?: number } = {}
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
      if (i < retries) await new Promise(r => setTimeout(r, backoffMs * Math.pow(2, i)));
    }
  }
  throw lastErr;
}

// -------------------- merge helpers (your current version) --------------------

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

// -------------------- live GW logic (as requested) --------------------

type EventLiveElement = {
  id: number; // player id
  stats: { total_points: number; minutes?: number };
};

type EventLiveResponse = { elements: EventLiveElement[] };

type PicksResponse = {
  entry_history: { event: number };
  picks: Array<{
    element: number;    // player id
    multiplier: number; // includes captain/triple/bench boost effects
    position: number;
    is_captain: boolean;
    is_vice_captain: boolean;
    element_type: number;
  }>;
  active_chip?: string | null;
};

function looksLive(live: EventLiveResponse | null | undefined): boolean {
  if (!live || !Array.isArray(live.elements)) return false;
  // Treat as live if the array has any elements with minutes or non-zero points.
  return live.elements.some(el => (el.stats.minutes ?? 0) > 0 || (el.stats.total_points ?? 0) !== 0);
}

function buildPointsMap(live: EventLiveResponse): Map<number, number> {
  const m = new Map<number, number>();
  for (const el of live.elements) {
    m.set(el.id, el.stats.total_points ?? 0);
  }
  return m;
}

/** Sum stats.total_points for each picked element × multiplier.
 * Uses ID → points map first; falls back to the "index = element-1" method you asked for.
 */
function sumLivePointsForPicks(live: EventLiveResponse, picks: PicksResponse["picks"]): number {
  const map = buildPointsMap(live);
  let sum = 0;
  for (const p of picks) {
    const viaMap = map.get(p.element);
    const viaIndex = live.elements[p.element - 1]?.stats?.total_points; // fallback requested
    const pts = (viaMap ?? viaIndex ?? 0) * (p.multiplier ?? 1);
    sum += pts;
  }
  return sum;
}

/** Mutates seriesMap to override the latest GW points/total_points with live values. */
async function applyLiveOverrideIfAny(seriesMap: Record<string, CurrentEvent[]>): Promise<void> {
  const names = Object.keys(seriesMap);
  if (names.length === 0) return;

  // Latest event across all users
  const latestEvent = Math.max(
    ...names.map(n => {
      const arr = seriesMap[n] ?? [];
      return arr.length ? Math.max(...arr.map(e => e.event)) : 0;
    })
  );
  if (!Number.isFinite(latestEvent) || latestEvent <= 0) return;

  // Fetch live for that GW
  let live: EventLiveResponse | null = null;
  try {
    live = await fetchWithRetry<EventLiveResponse>(`https://fantasy.premierleague.com/api/event/${latestEvent}/live/`, {
      retries: 1,
    });
  } catch {
    // no live / endpoint down — just skip
    return;
  }
  if (!looksLive(live)) return;

  // For each user in your Users list, fetch picks and override
  await Promise.all(
    Users.map(async (u) => {
      const arr = seriesMap[u.name];
      if (!arr) return;

      try {
        const picks = await fetchWithRetry<PicksResponse>(
          `https://fantasy.premierleague.com/api/entry/${u.code}/event/${latestEvent}/picks/`,
          { retries: 1 }
        );
        const livePoints = sumLivePointsForPicks(live as EventLiveResponse, picks.picks);

        // previous GW total (0 if none)
        const prevTotal =
          arr.find(e => e.event === latestEvent - 1)?.total_points ?? 0;

        const existing = arr.find(e => e.event === latestEvent);
        if (existing) {
          existing.points = livePoints;
          existing.total_points = prevTotal + livePoints;
        } else {
          // Insert a new minimal row if none yet for this GW
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
        // picks may not be available yet; ignore softly
      }
    })
  );
}

// -------------------- main builder --------------------

export async function buildFplPayload(): Promise<FplPayload> {
  // Fetch base histories
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

  // Apply live override for the latest event (mutates seriesMap)
  try {
    await applyLiveOverrideIfAny(seriesMap);
  } catch (e) {
    // never let live override kill the page
    console.warn("Live override failed:", e);
  }

  // Derive rows
  const cumulativeData   = mergeByEvent(seriesMap);
  const overallRankData  = mergeOverallRankByEvent(seriesMap);
  const leagueRankData   = mergeLeagueRankByEvent(seriesMap);
  const seriesKeys       = Object.keys(seriesMap);

  // Per-user series for other charts/leaderboard
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
