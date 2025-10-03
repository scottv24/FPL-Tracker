// app/api/fpl/route.ts
import { NextResponse } from "next/server";
import { buildFplPayload } from "@/app/lib/fpl";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await buildFplPayload();
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: "Failed to build payload" }, { status: 500 });
  }
}
