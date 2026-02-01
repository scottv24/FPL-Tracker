// app/records/[record]/page.tsx
import React from "react";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { buildFplPayloadCached } from "@/app/lib/fpl-cached";
import { colorFor } from "@/app/lib/theme";

type RecordKey = "best-week" | "biggest-stinker" | "bench";

function getConfig(key: string) {
  const record = key as RecordKey;
  switch (record) {
    case "best-week":
      return {
        title: "Best Week (Top 20)",
        unit: "pts" as const,
        valueLabel: "Points",
        pick: (p: Awaited<ReturnType<typeof buildFplPayloadCached>>) => p.bestWeeksTop20,
      };
    case "biggest-stinker":
      return {
        title: "Biggest Stinker (Bottom 20)",
        unit: "pts" as const,
        valueLabel: "Points",
        pick: (p: Awaited<ReturnType<typeof buildFplPayloadCached>>) => p.worstWeeksBottom20,
      };
    case "bench":
      return {
        title: "Most Points on Bench (Top 20)",
        unit: "%" as const,
        valueLabel: "Bench %",
        pick: (p: Awaited<ReturnType<typeof buildFplPayloadCached>>) => p.topBenchTop20,
      };
    default:
      return null;
  }
}

export default async function RecordsPage({
  params,
}: {
  // ✅ Next 15: params may be async/thenable
  params: Promise<{ record: string }> | { record: string };
}) {
  noStore();

  // ✅ Always await; works for both Promise + plain object
  const { record } = await Promise.resolve(params);

  const cfg = getConfig(record);
  if (!cfg) {
    return (
      <main className="min-h-screen bg-gray-800 text-gray-100 py-6 sm:px-4 px-2">
        <div className="mx-auto max-w-4xl space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200 hover:text-white"
          >
            ← Back
          </Link>
          <div className="rounded-2xl bg-gray-900 p-6 shadow-xl/20">
            <h1 className="text-xl font-semibold">Not found</h1>
            <p className="mt-2 text-sm text-slate-300">That records page doesn’t exist.</p>
          </div>
        </div>
      </main>
    );
  }

  const data = await buildFplPayloadCached();
  const rows = cfg.pick(data);

  return (
    <main className="min-h-screen bg-gray-800 text-gray-100 py-6 sm:px-4 px-2">
      <div className="mx-auto max-w-4xl space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200 hover:text-white"
        >
          ← Back
        </Link>

        <div className="rounded-2xl bg-gray-900 p-4 sm:p-6 shadow-xl/20">
          <h1 className="text-xl font-semibold">{cfg.title}</h1>

          <div className="mt-4 overflow-x-auto rounded-xl ring-1 ring-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-slate-200">
                <tr>
                  <th className="px-3 py-2 w-12">#</th>
                  <th className="px-3 py-2">Player</th>
                  <th className="px-3 py-2 w-24">GW</th>
                  <th className="px-3 py-2 w-28">{cfg.valueLabel}</th>
                </tr>
              </thead>
              <tbody className="font-bold">
                {rows.slice(0, 20).map((r, i) => {
                  const displayValue =
                    cfg.unit === "%"
                      ? `${(Math.round(r.value * 10) / 10).toFixed(1)}%`
                      : String(r.value);

                  const href = `https://fantasy.premierleague.com/entry/${r.code}/event/${r.event}`;

                  return (
                    <tr
                      key={`${r.code}-${r.event}-${i}`}
                      className="odd:bg-white/0 even:bg-white/5 hover:bg-white/10"
                    >
                      <td className="px-3 py-2 text-slate-300 tabular-nums">{i + 1}</td>
                      <td className="px-3 py-2 font-semibold">
                        <a href={href} className="hover:underline" rel="noreferrer">
                          <NameChip name={r.name} />
                        </a>
                      </td>
                      <td className="px-3 py-2 text-slate-300 tabular-nums">
                        <a href={href} className="hover:underline" rel="noreferrer">
                          {r.event}
                        </a>
                      </td>
                      <td className="px-3 py-2 tabular-nums">{displayValue}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-slate-400">
            Tip: click a player name (or GW) to open that manager’s FPL page for the gameweek.
          </p>
        </div>
      </div>
    </main>
  );
}

function NameChip({ name }: { name: string }) {
  const c = colorFor(name);
  return (
    <span
      className={`inline-flex max-w-[18rem] items-center truncate rounded-full px-2 py-0.5 text-xs font-semibold text-white ring-1 ring-white/20 ${c.twDot}`}
      title={name}
    >
      {name}
    </span>
  );
}
