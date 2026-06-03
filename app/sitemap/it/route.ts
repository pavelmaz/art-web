import {
  buildUrlset,
  localeHubSitemapEntries,
  LOCALE_HUB_SITEMAP_XML_HEADERS,
} from "@/lib/locale-hub-sitemap";

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(buildUrlset(localeHubSitemapEntries("it")), {
    status: 200,
    headers: LOCALE_HUB_SITEMAP_XML_HEADERS,
  });
}
