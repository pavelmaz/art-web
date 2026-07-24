import { createClient } from "@supabase/supabase-js";

import { ARTIST_INDEX_LETTERS } from "@/lib/artist-index";
import { CONTACT_PATHS } from "@/lib/contact-translations";
import { fineArtProPath } from "@/lib/fineart-pro-path";
import { HREFLANG_LOCALES, LOCALE_ROUTE_CONFIG } from "@/lib/locale-routes";
import { escapeXml, getPublicSiteUrl } from "@/lib/sitemap-xml";
import { supabase as blogSupabase } from "@/lib/supabase";
import type { Locale } from "@/lib/translations";
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

type SitemapEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
};

function buildUrlset(entries: SitemapEntry[]): string {
  const inner = entries
    .map((e) => {
      let xml = `  <url>\n    <loc>${escapeXml(e.loc)}</loc>`;
      if (e.lastmod) xml += `\n    <lastmod>${e.lastmod}</lastmod>`;
      if (e.changefreq) xml += `\n    <changefreq>${e.changefreq}</changefreq>`;
      if (e.priority != null) xml += `\n    <priority>${e.priority}</priority>`;
      xml += `\n  </url>`;
      return xml;
    })
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
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
        if (a && !/^https?:\/\//i.test(a)) {
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
    const entries: SitemapEntry[] = [];

    // Core static pages. These were never listed in any sitemap (only detail pages
    // were) — Bing Webmaster flags "important pages missing in sitemaps" for them.
    // Home + top-level hubs per locale, plus Fine Art Pro, Contact and Terms.
    for (const locale of HREFLANG_LOCALES) {
      const cfg = locale === "en" ? null : LOCALE_ROUTE_CONFIG[locale];
      const prefix = cfg ? cfg.prefix : "";
      entries.push({ loc: `${base}${prefix || "/"}`.replace(/([^:])\/$/, "$1"), changefreq: "daily", priority: 1 });
      entries.push({ loc: `${base}${prefix}/${cfg ? cfg.segments.artworks : "artworks"}`, changefreq: "daily", priority: 0.9 });
      entries.push({ loc: `${base}${prefix}/${cfg ? cfg.segments.artists : "artists"}`, changefreq: "weekly", priority: 0.9 });
      entries.push({ loc: `${base}${prefix}/${cfg ? cfg.segments.museums : "museums"}`, changefreq: "weekly", priority: 0.8 });
      entries.push({ loc: `${base}${prefix}/${cfg ? cfg.segments.genres : "genres"}`, changefreq: "weekly", priority: 0.8 });
      entries.push({ loc: `${base}${prefix}/${cfg ? cfg.segments.styles : "styles"}`, changefreq: "weekly", priority: 0.8 });
      entries.push({ loc: `${base}${fineArtProPath(locale as Locale)}`, changefreq: "monthly", priority: 0.8 });
      entries.push({ loc: `${base}${CONTACT_PATHS[locale as Locale]}`, changefreq: "monthly", priority: 0.5 });
    }
    entries.push({ loc: `${base}/terms`, changefreq: "monthly", priority: 0.3 });
    entries.push({
      loc: `${base}/public-domain-images-for-commercial-use`,
      changefreq: "weekly",
      priority: 0.9,
    });

    for (const name of Array.from(artists).sort()) {
      const seg = slugify(name);
      if (seg) {
        entries.push({ loc: `${base}/artists/${seg}` });
      }
    }

    for (const letter of ARTIST_INDEX_LETTERS) {
      entries.push({
        loc: `${base}/artists/letter/${letter}`,
        changefreq: "weekly",
        priority: 0.6,
      });
    }

    const GENRE_SLUGS = [
      "landscape", "marine", "architecture", "genre-scene",
      "religious", "portrait", "figurative", "decorative-art",
      "historical", "interior", "botanical", "abstract",
      "animal", "still-life", "mythology", "allegory",
      "drawing", "illustration",
    ];
    const genreSlugsSet = new Set(GENRE_SLUGS);
    const today = new Date().toISOString().split("T")[0];

    for (const slug of GENRE_SLUGS) {
      entries.push({
        loc: `${base}/genres/${slug}`,
        lastmod: today,
        changefreq: "weekly",
        priority: 0.8,
      });
    }
    for (const title of Array.from(genres).sort()) {
      const seg = slugify(title);
      if (seg && !genreSlugsSet.has(seg)) {
        entries.push({ loc: `${base}/genres/${seg}` });
      }
    }

    for (const title of Array.from(styles).sort()) {
      const seg = slugify(title);
      if (seg) {
        entries.push({ loc: `${base}/styles/${seg}` });
      }
    }
    for (const name of Array.from(museums).sort()) {
      const seg = slugify(name);
      if (seg) {
        entries.push({ loc: `${base}/museums/${seg}` });
      }
    }

    entries.push({
      loc: `${base}/topics`,
      lastmod: today,
      changefreq: "weekly",
      priority: 0.8,
    });
    entries.push({
      loc: `${base}/countries`,
      lastmod: today,
      changefreq: "weekly",
      priority: 0.8,
    });

    const COUNTRY_NAMES = [
      "France", "Amsterdam", "England", "United States", "Netherlands",
      "Germany", "Austria", "Poland", "Belgium", "Switzerland", "Italy",
      "Japan", "Denmark", "Norway", "Sweden", "Russia", "Scotland",
      "Hungary", "China", "Czech Republic", "Spain", "Slovakia",
      "New Zealand", "Ireland", "Canada", "Finland",
    ];
    for (const country of COUNTRY_NAMES) {
      entries.push({
        loc: `${base}/countries/${country.toLowerCase().replace(/\s+/g, "-")}`,
        lastmod: today,
        changefreq: "monthly",
        priority: 0.7,
      });
    }

    const TOP_TOPICS = [
      "river", "forest", "sunset", "waves", "clouds", "village",
      "mountains", "sea", "ruins", "trees", "horse", "flowers",
      "portrait", "winter", "snow", "boats", "cathedral", "bridge",
      "garden", "children", "women", "soldiers", "harvest", "windmill",
      "castle", "ship", "coast", "dawn", "storm", "fog", "autumn",
      "spring", "moon", "fire", "animals", "market", "street",
      "classical", "mythological", "biblical", "nude", "battle",
      "hunt", "feast", "dance", "music", "reading", "writing",
      "fishing", "sailing",
    ];
    for (const tag of TOP_TOPICS) {
      entries.push({
        loc: `${base}/topics/${tag.replace(/\s+/g, "-")}`,
        lastmod: today,
        changefreq: "monthly",
        priority: 0.6,
      });
    }

    entries.push({
      loc: `${base}/blog`,
      lastmod: today,
      changefreq: "weekly",
      priority: 0.7,
    });

    const { data: blogPosts, error: blogError } = await blogSupabase
      .from("blog_posts")
      .select("slug, published_at")
      .eq("locale", "en")
      .eq("status", "published")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false });

    if (blogError) {
      console.error("[sitemap/static] blog_posts", blogError);
    } else {
      for (const row of blogPosts ?? []) {
        if (typeof row.slug !== "string" || !row.slug.trim()) continue;
        const lastmod =
          typeof row.published_at === "string"
            ? row.published_at.split("T")[0]
            : today;
        entries.push({
          loc: `${base}/blog/${row.slug}`,
          lastmod,
          changefreq: "monthly",
          priority: 0.6,
        });
      }
    }

    return new Response(buildUrlset(entries), { status: 200, headers: XML_HEADERS });
  } catch (err) {
    console.error("[sitemap/static] fatal", err);
    return new Response(emptyUrlset(), { status: 200, headers: XML_HEADERS });
  }
}
