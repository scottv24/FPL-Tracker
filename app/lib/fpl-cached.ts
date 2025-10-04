// app/lib/fpl-cached.ts
import { unstable_cache as cache } from "next/cache";
import { buildFplPayload } from "./fpl";

export const buildFplPayloadCached = cache(
  async () => {
    return await buildFplPayload();
  },
  ["fpl-payload"],
  { revalidate: 60 } // adjust if you want
);
