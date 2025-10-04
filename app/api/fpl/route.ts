// app/api/fpl/route.ts
import { NextResponse } from "next/server";
import { buildFplPayloadCached } from "@/app/lib/fpl-cached";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await buildFplPayloadCached();
    // Cache for 15s in browser, 60s on the edge, allow stale-while-revalidate
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=15, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to build payload" }, { status: 500 });
  }
}
