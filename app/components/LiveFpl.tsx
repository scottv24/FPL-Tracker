// app/components/LiveFpl.tsx
"use client";
import React from "react";
import LeaderboardWithChart from "./LeaderboardWithChart";
import type { FplPayload } from "@/app/lib/fpl";

function formatTimeLondon(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Europe/London",
  }).format(d);
}

export default function LiveFpl({
  initial,
  initialGeneratedAt,
}: {
  initial: FplPayload;
  initialGeneratedAt: string;
}) {
  const [data, setData] = React.useState<FplPayload>(initial);
  const [lastUpdated, setLastUpdated] = React.useState<Date>(new Date(initialGeneratedAt));

  React.useEffect(() => {
    let cancelled = false;
    let timer: any;

    async function tick() {
      try {
        const res = await fetch("/api/fpl", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as FplPayload;
        if (!cancelled) {
          setData(json);
          setLastUpdated(new Date());
        }
      } catch {
        // ignore transient errors
      } finally {
        if (!cancelled) {
          timer = setTimeout(tick, 15000 + Math.random() * 5000);
        }
      }
    }

    // soft start to avoid SSR+CSR duplicate burst
    timer = setTimeout(tick, 15000 + Math.random() * 5000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <>
      <LeaderboardWithChart
        cumulativeData={data.cumulativeData}
        leagueRankData={data.leagueRankData}
        overallRankData={data.overallRankData}
        seriesKeys={data.seriesKeys}
        seriesByUser={data.seriesByUser}
        chipsByUser={data.chipsByUser}
        chipsMetaByUser={data.chipsMetaByUser}
        codesByUser={data.codesByUser}
        bestWeeksTop3={data.bestWeeksTop3}
        worstWeeksBottom3={data.worstWeeksBottom3}
        topBenchTop3={data.topBenchTop3}
      />
      <p className="mt-2 text-xs text-gray-400" suppressHydrationWarning>
        Last updated: {formatTimeLondon(lastUpdated)}
      </p>
    </>
  );
}
