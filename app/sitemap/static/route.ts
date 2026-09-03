import { createClient } from "@supabase/supabase-js";

import { ARTIST_INDEX_LETTERS } from "@/lib/artist-index";
import { CONTACT_PATHS } from "@/lib/contact-translations";
import { fineArtProPath } from "@/lib/fineart-pro-path";
import { HREFLANG_LOCALES, LOCALE_ROUTE_CONFIG } from "@/lib/locale-routes";
import { COMMERCIAL_USE_PATHS } from "@/lib/commercial-use-landing";
import { escapeXml, getPublicSiteUrl } from "@/lib/sitemap-xml";
import { supabase as blogSupabase } from "@/lib/supabase";
import type { Locale } from "@/lib/translations";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";


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
  changefreq?: string;
  priority?: number;
};

function buildUrlset(entries: SitemapEntry[]): string {
  const inner = entries
    .map((e) => {
      let xml = `  <url>\n    <loc>${escapeXml(e.loc)}</loc>`;
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

    // One indexed DISTINCT pass in Postgres instead of paging all 109k artworks
    // in 1,000-row batches. That scan was 110 sequential round trips and took
    // 29-88 seconds, so Googlebot abandoned the fetch — which is why Search
    // Console reported "no referring sitemap" for pages that ARE listed here.
    // The RPC returns the same values in ~2s.
    const { data: facets, error: facetsError } = await supabase.rpc("sitemap_facets");
    if (facetsError) {
      console.error("[sitemap/static] facets", facetsError);
      return new Response(emptyUrlset(), { status: 200, headers: XML_HEADERS });
    }

    const f = (facets ?? {}) as {
      artists?: string[];
      genres?: string[];
      styles?: string[];
      museums?: string[];
    };
    // Same filters the row scan applied.
    const artists = new Set(
      (f.artists ?? []).map((s) => s.trim()).filter((s) => s && !/^https?:\/\//i.test(s))
    );
    const genres = new Set((f.genres ?? []).map((s) => s.trim()).filter(Boolean));
    const styles = new Set((f.styles ?? []).map((s) => s.trim()).filter(Boolean));
    const museums = new Set(
      (f.museums ?? []).map((s) => s.trim()).filter((s) => s && !isExcludedMuseum(s))
    );

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
    // "Public domain images for commercial use" landing, one per locale.
    for (const path of Object.values(COMMERCIAL_USE_PATHS)) {
      entries.push({ loc: `${base}${path}`, changefreq: "weekly", priority: 0.9 });
    }

    // Curated-set hubs (prints / wall charts / book illustrations). Each series
    // gets its own page, so they belong here like the genre and museum hubs —
    // without this they are unreachable to a crawler except through the menu.
    {
      const HUB_PATHS: Record<string, string> = {
        print: "/prints",
        "book-illustration": "/book-illustrations",
      };
      for (const path of Object.values(HUB_PATHS)) {
        entries.push({ loc: `${base}${path}`, changefreq: "weekly", priority: 0.8 });
      }
      const { data: printRows } = await supabase
        .from("artworks")
        .select("collection, object_type")
        .in("object_type", Object.keys(HUB_PATHS));
      const seen = new Set<string>();
      for (const r of (printRows ?? []) as { collection: string | null; object_type: string | null }[]) {
        const path = HUB_PATHS[r.object_type ?? "print"];
        const name = r.collection?.trim() || (r.object_type === "print" ? "Individual prints" : "");
        const seg = slugify(name);
        if (!seg || !path) continue;
        const loc = `${base}${path}/${seg}`;
        if (!seen.has(loc)) {
          seen.add(loc);
          entries.push({ loc, changefreq: "monthly", priority: 0.6 });
        }
      }
    }

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

    for (const slug of GENRE_SLUGS) {
      entries.push({
        loc: `${base}/genres/${slug}`,
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
      changefreq: "weekly",
      priority: 0.8,
    });
    entries.push({
      loc: `${base}/countries`,
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
        changefreq: "monthly",
        priority: 0.6,
      });
    }

    entries.push({
      loc: `${base}/blog`,
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
        entries.push({
          loc: `${base}/blog/${row.slug}`,
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
