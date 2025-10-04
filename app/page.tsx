// app/page.tsx
import React from "react";
import { unstable_noStore as noStore } from "next/cache";
import LiveFpl from "./components/LiveFpl";
import { buildFplPayloadCached } from "./lib/fpl-cached";
import Leaderboard from "./components/Leaderboard";
import { PlayerRow } from "./lib/fpl";

export const dynamic = "force-dynamic";


export default async function Page() {
  // You can drop noStore if you rely on the cached builder’s revalidate window
  noStore();
  const data = await buildFplPayloadCached();
  const initialGeneratedAt = new Date().toISOString();

  return (
    <main className="min-h-screen bg-gray-800 text-gray-100 py-6 sm:px-4 px-2">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-end justify-between gap-4 px-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Speak of the Neville Tracker</h1>
            <p className="text-sm text-gray-300">
              
            </p>
          </div>
        </header>
      <LiveFpl initial={data} initialGeneratedAt={initialGeneratedAt} />
      </div>
    </main>
  );
}
