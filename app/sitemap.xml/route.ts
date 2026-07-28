import {
  ARTWORK_SITEMAP_PAGE_SIZE,
  CONTENT_REFRESH_LASTMOD,
  toLastmod,
} from "@/lib/artwork-sitemap-response";
import { getPublicSiteUrl, escapeXml } from "@/lib/sitemap-xml";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Used only if the live count can't be read; keeps the index covering all artworks. */
const FALLBACK_SITEMAP_COUNT = 180;

/** Newest artwork's created_at — read via id-desc (index-only, ~instant) so we can
 *  stamp the index children with a real "catalog last updated" <lastmod>. Returns
 *  null on any error so the caller floors at the content-refresh date; never adds a
 *  slow per-child aggregation that could hit the statement timeout. */
async function newestArtworkCreatedAt(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("artworks")
      .select("created_at")
      .order("id", { ascending: false })
      .limit(1);
    if (error) {
      return null;
    }
    return (data as { created_at: string | null }[] | null)?.[0]?.created_at ?? null;
  } catch {
    return null;
  }
}

/** Number of artwork sitemap pages = ceil(total artworks / page size), read live so
 *  the index never drops newly added artworks. */
async function artworkSitemapPageCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("artworks")
      .select("id", { count: "exact", head: true });
    if (error || !count || count <= 0) {
      return FALLBACK_SITEMAP_COUNT;
    }
    return Math.ceil(count / ARTWORK_SITEMAP_PAGE_SIZE);
  } catch {
    return FALLBACK_SITEMAP_COUNT;
  }
}

function emptySitemapIndex(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</sitemapindex>
`;
}

export async function GET() {
  try {
    const base = getPublicSiteUrl();
    const [pageCount, newestCreated] = await Promise.all([
      artworkSitemapPageCount(),
      newestArtworkCreatedAt(),
    ]);
    // One honest, site-wide date for every child: the catalog's last real change
    // (newest artwork), floored at the content-refresh date. Advances only when
    // content actually changes — never faked to "now" per request.
    const lastmod = toLastmod(newestCreated) ?? new Date(CONTENT_REFRESH_LASTMOD).toISOString();
    const locs: string[] = [`${base}/sitemap/static`];
    for (let i = 0; i < pageCount; i++) {
      locs.push(`${base}/sitemap/artworks/${i}`);
    }
    for (let i = 0; i < pageCount; i++) {
      locs.push(`${base}/sitemap/es/artworks/${i}`);
    }
    for (let i = 0; i < pageCount; i++) {
      locs.push(`${base}/sitemap/pt/artworks/${i}`);
    }
    for (let i = 0; i < pageCount; i++) {
      locs.push(`${base}/sitemap/ja/artworks/${i}`);
    }
    for (const loc of ["fr", "de", "it", "ko", "ru", "zh"] as const) {
      for (let i = 0; i < pageCount; i++) {
        locs.push(`${base}/sitemap/${loc}/artworks/${i}`);
      }
      locs.push(`${base}/sitemap/${loc}`);
    }
    locs.push(`${base}/sitemap/es`);
    locs.push(`${base}/sitemap/pt`);
    locs.push(`${base}/sitemap/ja`);
    for (let i = 0; i < pageCount; i++) {
      locs.push(`${base}/sitemap/images/${i}`);
    }

    const body =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      locs
        .map(
          (loc) =>
            `  <sitemap>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>`
        )
        .join("\n") +
      "\n</sitemapindex>\n";

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  } catch {
    return new Response(emptySitemapIndex(), {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  }
}
