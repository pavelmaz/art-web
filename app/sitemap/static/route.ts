import { createClient } from "@supabase/supabase-js";

import { escapeXml, getPublicSiteUrl } from "@/lib/sitemap-xml";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SCAN_BATCH = 1000;

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

function isExcludedMuseum(m: string): boolean {
  return m.trim().toLowerCase() === "private collection";
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl?.trim() || !supabaseKey?.trim()) {
      return new Response(emptyUrlset(), { status: 200, headers: XML_HEADERS });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const artists = new Set<string>();
    const genres = new Set<string>();
    const styles = new Set<string>();
    const museums = new Set<string>();

    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("artworks")
        .select("artist_display, genre_title, style_title, museum")
        .order("id", { ascending: true })
        .range(from, from + SCAN_BATCH - 1);

      if (error) {
        console.error("[sitemap/static] batch", from, error);
        break;
      }

      const rows = data ?? [];
      if (!rows.length) {
        break;
      }

      for (const row of rows as Array<{
        artist_display: string | null;
        genre_title: string | null;
        style_title: string | null;
        museum: string | null;
      }>) {
        const a = row.artist_display?.trim();
        if (a) {
          artists.add(a);
        }
        const g = row.genre_title?.trim();
        if (g) {
          genres.add(g);
        }
        const s = row.style_title?.trim();
        if (s) {
          styles.add(s);
        }
        const m = row.museum?.trim();
        if (m && !isExcludedMuseum(m)) {
          museums.add(m);
        }
      }

      if (rows.length < SCAN_BATCH) {
        break;
      }
      from += SCAN_BATCH;
    }

    const base = getPublicSiteUrl();
    const locs: string[] = [];

    for (const name of Array.from(artists).sort()) {
      const seg = slugify(name);
      if (seg) {
        locs.push(`${base}/artists/${seg}`);
      }
    }
    for (const title of Array.from(genres).sort()) {
      const seg = slugify(title);
      if (seg) {
        locs.push(`${base}/genres/${seg}`);
      }
    }
    for (const title of Array.from(styles).sort()) {
      const seg = slugify(title);
      if (seg) {
        locs.push(`${base}/styles/${seg}`);
      }
    }
    for (const name of Array.from(museums).sort()) {
      const seg = slugify(name);
      if (seg) {
        locs.push(`${base}/museums/${seg}`);
      }
    }

    return new Response(buildUrlset(locs), { status: 200, headers: XML_HEADERS });
  } catch (err) {
    console.error("[sitemap/static] fatal", err);
    return new Response(emptyUrlset(), { status: 200, headers: XML_HEADERS });
  }
}
