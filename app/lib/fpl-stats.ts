// // app/lib/fpl-stats.ts
// // Small, isolated helper you can call from your existing build routine.

// import type { CurrentEvent, StatItem } from "./fpl-types";

// /**
//  * Given a mapping of player name -> array of CurrentEvent (as returned by FPL /history),
//  * compute the three requested arrays.
//  */
// export function deriveStatArrays(historyByUser: Record<string, CurrentEvent[]>): {
//   bestWeeksTop3: StatItem[];
//   worstWeeksBottom3: StatItem[];
//   topBenchTop3: StatItem[];
// } {
//   const allWeeks: StatItem[] = [];
//   const allBench: StatItem[] = [];

//   for (const [name, events] of Object.entries(historyByUser)) {
//     for (const e of events) {
//       if (Number.isFinite(e.points)) {
//         allWeeks.push({ name, event: e.event, value: e.points });
//       }
//       const bench = e.points_on_bench;
//       if (Number.isFinite(bench)) {
//         allBench.push({ name, event: e.event, value: bench as number });
//       }
//     }
//   }

//   const bestWeeksTop3 = [...allWeeks].sort((a, b) => b.value - a.value).slice(0, 3);
//   const worstWeeksBottom3 = [...allWeeks].sort((a, b) => a.value - b.value).slice(0, 3);
//   const topBenchTop3 = [...allBench].sort((a, b) => b.value - a.value).slice(0, 3);

//   return { bestWeeksTop3, worstWeeksBottom3, topBenchTop3 };
// }
