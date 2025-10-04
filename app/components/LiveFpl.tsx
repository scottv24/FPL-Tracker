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
        // ignore; we'll try again
      } finally {
        if (!cancelled) {
          // regular cadence after the first hit
          timer = setTimeout(tick, 60_000);
        }
      }
    }

    const onVis = () => {
      if (document.hidden) {
        clearTimeout(timer);
      } else {
        // resume soon after returning to the tab
        clearTimeout(timer);
        timer = setTimeout(tick, 4_000 + Math.random() * 2_000);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    // 🔑 Initial delay to avoid an immediate duplicate right after SSR
    timer = setTimeout(tick, 15_000 + Math.random() * 5_000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
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
      />
      <p className="mt-2 text-xs text-gray-400" suppressHydrationWarning>
        Last updated: {formatTimeLondon(lastUpdated)}
      </p>
    </>
  );
}
