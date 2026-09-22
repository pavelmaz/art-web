import { CORE_XML_HEADERS, buildCoreUrlset, coreHubLocs } from "@/lib/core-sitemap";

export const revalidate = 86400;

export async function GET() {
  try {
    const locs = await coreHubLocs();
    if (!locs.length) throw new Error("[sitemap/core/hubs] no URLs");
    return new Response(buildCoreUrlset(locs), { status: 200, headers: CORE_XML_HEADERS });
  } catch (err) {
    console.error("[sitemap/core/hubs]", err);
    throw err;
  }
}
