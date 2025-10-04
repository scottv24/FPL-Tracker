// app/lib/fpl-types.ts
export type CurrentEvent = {
  event: number;
  points: number;
  total_points: number;
  rank: number;
  overall_rank: number | null;   
  value: number;
};

export type Chip = { name: string; time: string; event: number };

export interface FplHistoryResponse {
  current: CurrentEvent[];
  chips?: Chip[];
}

export interface FplSummary {
  cumulativeData: Array<Record<string, number>>;
  overallRankData: Array<Record<string, number | null>>;
  leagueRankData: Array<Record<string, number>>;
  seriesKeys: string[];
  seriesByUser: Record<string, { event: number; total_points: number }[]>;
  chipsByUser: Record<string, Chip[]>;
  maxGw: number;
}
