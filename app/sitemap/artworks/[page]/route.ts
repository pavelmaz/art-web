import { createClient } from "@supabase/supabase-js";

import { escapeXml, getPublicSiteUrl } from "@/lib/sitemap-xml";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 500;
const MAX_PAGE_INDEX = 144;

const XML_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=0, must-revalidate",
} as const;

function emptyUrlset(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>
`;
}

function buildUrlset(locs: string[]): string {
  const inner = locs
    .map((loc) => `  <url>\n    <loc>${escapeXml(loc)}</loc>\n  </url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${inner}
</urlset>
`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ page: string }> }
) {
  try {
    const { page: raw } = await context.params;
    const page = parseInt(raw, 10);
    if (!Number.isFinite(page) || page < 0 || page > MAX_PAGE_INDEX || String(page) !== raw) {
      return new Response(emptyUrlset(), { status: 200, headers: XML_HEADERS });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl?.trim() || !supabaseKey?.trim()) {
      return new Response(emptyUrlset(), { status: 200, headers: XML_HEADERS });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const from = page * PAGE_SIZE;
    const to = page * PAGE_SIZE + (PAGE_SIZE - 1);

    const { data, error } = await supabase
      .from("artworks")
      .select("slug")
      .not("slug", "is", null)
      .order("score", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to);

    if (error) {
      console.error("[sitemap/artworks]", page, error);
      return new Response(emptyUrlset(), { status: 200, headers: XML_HEADERS });
    }

    const base = getPublicSiteUrl();
    const rows = (data as { slug: string | null }[] | null) ?? [];
    const locs = rows
      .map((r) => r.slug?.trim())
      .filter((s): s is string => Boolean(s))
      .map((slug) => `${base}/artworks/${encodeURIComponent(slug)}`);

    return new Response(buildUrlset(locs), { status: 200, headers: XML_HEADERS });
  } catch (err) {
    console.error("[sitemap/artworks] fatal", err);
    return new Response(emptyUrlset(), { status: 200, headers: XML_HEADERS });
  }
}
