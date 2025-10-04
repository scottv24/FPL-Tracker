// app/page.tsx
import React from "react";
import { unstable_noStore as noStore } from "next/cache";
import LiveFpl from "./components/LiveFpl";
import { buildFplPayloadCached } from "./lib/fpl-cached";

export const dynamic = "force-dynamic";

export default async function Page() {
  // You can drop noStore if you rely on the cached builder’s revalidate window
  noStore();
  const data = await buildFplPayloadCached();

  const initialGeneratedAt = new Date().toISOString();

  return (
    <main className="min-h-screen bg-neutral-900 text-white py-10">
      <LiveFpl initial={data} initialGeneratedAt={initialGeneratedAt} />
    </main>
  );
}
