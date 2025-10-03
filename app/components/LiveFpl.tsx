// app/components/LiveFpl.tsx
"use client";

import React from "react";
import LeaderboardWithChart from "./LeaderboardWithChart";
import type { FplPayload } from "@/app/lib/fpl";

function formatTimeLondon(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  // Deterministic across server & client:
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Europe/London",
  }).format(d);
}

export default function LiveFpl({
  initial,
  initialGeneratedAt, // 👈 SSR snapshot
}: {
  initial: FplPayload;
  initialGeneratedAt: string;
}) {
  const [data, setData] = React.useState<FplPayload>(initial);
  // 👇 initialise from the server snapshot to avoid mismatch
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
          setLastUpdated(new Date()); // updates AFTER hydration
        }
      } catch {
        // ignore; try again next time
      } finally {
        if (!cancelled) {
          timer = setTimeout(tick, 60_000); // 1 minute
        }
      }
    }

    // Pause/resume polling on tab visibility
    const onVis = () => {
      if (document.hidden) clearTimeout(timer);
      else {
        clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    // start
    tick();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <>
      {data.failures.length > 0 && (
        <div className="mb-3 rounded-md border border-yellow-500/40 bg-yellow-500/10 text-yellow-200 px-3 py-2 text-sm">
          Couldn’t load data for: <span className="font-medium">{data.failures.join(", ")}</span>. Rendering with partial data.
        </div>
      )}

      <LeaderboardWithChart
        cumulativeData={data.cumulativeData}
        rankData={data.rankData}
        seriesKeys={data.seriesKeys}
        seriesByUser={data.seriesByUser}
        chipsByUser={data.chipsByUser}
        chipsMetaByUser={data.chipsMetaByUser}
        codesByUser={data.codesByUser}
      />

      {/* 👇 deterministic formatting + suppress hydration warning */}
      <p className="mt-2 text-xs text-gray-400" suppressHydrationWarning>
        Last updated: {formatTimeLondon(lastUpdated)}
      </p>
    </>
  );
}
