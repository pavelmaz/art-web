import { ARTWORK_SITEMAP_PAGE_SIZE } from "@/lib/artwork-sitemap-response";
import { getPublicSiteUrl, escapeXml } from "@/lib/sitemap-xml";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Used only if the live count can't be read; keeps the index covering all artworks. */
const FALLBACK_SITEMAP_COUNT = 180;

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
    const pageCount = await artworkSitemapPageCount();
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
            `  <sitemap>\n    <loc>${escapeXml(loc)}</loc>\n  </sitemap>`
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
