import { buildStyleSlugLookup, processBlogHtml } from "@/lib/blog-html";
import { safeNullableString, safeString, safeTrim } from "@/lib/blog-helpers";
import type {
  BlogArtwork,
  BlogPost,
  BlogPostListItem,
  BlogPostRow,
  BlogSection,
  BlogSectionResolved,
} from "@/lib/blog-types";
import { supabase } from "@/lib/supabase";
import { artworkImageUrl } from "@/lib/utils";

const BLOG_LOCALE = "en";
const ARTWORK_COLUMNS =
  "id, slug, title, artist_display, date_display, image_id, url, alt_text";
const BLOG_POST_COLUMNS =
  "id, slug, locale, title, meta_title, meta_description, intro_html, conclusion_html, sections, status, published_at";

function parseArtworkId(value: unknown): string | null {
  const id = safeTrim(value);
  return id || null;
}

function parseSections(raw: unknown): BlogSection[] {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const heading = safeString(row.heading);
      const html = safeString(row.html);
      const artwork_id = parseArtworkId(row.artwork_id);
      if (!heading && !html) return null;
      return { heading, html, artwork_id };
    })
    .filter((section): section is BlogSection => section !== null);
}

async function fetchArtworksByIds(ids: string[]): Promise<Map<string, BlogArtwork>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();

  try {
    const { data, error } = await supabase
      .from("artworks")
      .select(ARTWORK_COLUMNS)
      .in("id", unique);

    if (error) {
      console.error("[blog] fetch artworks:", error.message);
      return new Map();
    }

    const map = new Map<string, BlogArtwork>();
    for (const row of data ?? []) {
      const id = safeTrim(row.id);
      const slug = safeTrim(row.slug);
      const title = safeTrim(row.title);
      if (!id || !slug || !title) continue;

      map.set(id, {
        id,
        slug,
        title,
        artist_display: safeTrim(row.artist_display) || "Unknown artist",
        date_display: safeNullableString(row.date_display),
        image_id: safeNullableString(row.image_id),
        url: safeNullableString(row.url),
        alt_text: safeNullableString(row.alt_text),
      });
    }
    return map;
  } catch (err) {
    console.error("[blog] fetch artworks exception:", err);
    return new Map();
  }
}

async function getStyleSlugLookup() {
  try {
    const { data, error } = await supabase.from("styles").select("name, slug");
    if (error) {
      console.error("[blog] fetch styles:", error.message);
      return buildStyleSlugLookup([]);
    }
    return buildStyleSlugLookup((data ?? []) as Array<{ name: unknown; slug: unknown }>);
  } catch (err) {
    console.error("[blog] fetch styles exception:", err);
    return buildStyleSlugLookup([]);
  }
}

function artworkImage(artwork: BlogArtwork | null): string | null {
  if (!artwork) return null;
  try {
    const url = artworkImageUrl({ image_id: artwork.image_id, url: artwork.url });
    return url || null;
  } catch {
    return null;
  }
}

function firstSectionArtworkId(sections: BlogSection[]): string | null {
  for (const section of sections) {
    if (section.artwork_id) return section.artwork_id;
  }
  return null;
}

async function hydrateBlogPost(row: BlogPostRow): Promise<BlogPost> {
  const sections = parseSections(row.sections);
  const artworkIds = sections.map((s) => s.artwork_id).filter((id): id is string => !!id);

  const [artworks, styleSlugs] = await Promise.all([
    fetchArtworksByIds(artworkIds),
    getStyleSlugLookup(),
  ]);

  const sectionsResolved: BlogSectionResolved[] = sections.map((section) => ({
    ...section,
    html: processBlogHtml(section.html, styleSlugs),
    artwork: section.artwork_id ? artworks.get(section.artwork_id) ?? null : null,
  }));

  return {
    id: row.id,
    slug: row.slug,
    locale: row.locale,
    title: row.title,
    meta_title: row.meta_title,
    meta_description: row.meta_description,
    status: row.status,
    published_at: row.published_at,
    intro_html: processBlogHtml(row.intro_html, styleSlugs),
    conclusion_html: processBlogHtml(row.conclusion_html, styleSlugs),
    sections: sectionsResolved,
  };
}

function rowFromDb(data: Record<string, unknown>): BlogPostRow | null {
  const slug = safeTrim(data.slug);
  const title = safeTrim(data.title);
  if (!slug || !title) return null;

  return {
    id: safeTrim(data.id),
    slug,
    locale: safeTrim(data.locale) || BLOG_LOCALE,
    title,
    meta_title: safeNullableString(data.meta_title),
    meta_description: safeNullableString(data.meta_description),
    intro_html: safeNullableString(data.intro_html),
    conclusion_html: safeNullableString(data.conclusion_html),
    sections: parseSections(data.sections),
    status: safeTrim(data.status) === "published" ? "published" : "draft",
    published_at: safeNullableString(data.published_at),
  };
}

export async function getPublishedBlogPosts(): Promise<BlogPostListItem[]> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug, title, meta_description, published_at, sections")
    .eq("locale", BLOG_LOCALE)
    .eq("status", "published")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });

  if (error) {
    console.error("[blog] list posts:", error.message);
    return [];
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const artworkIds = rows
    .map((row) => firstSectionArtworkId(parseSections(row.sections)))
    .filter((id): id is string => !!id);

  const artworks = await fetchArtworksByIds(artworkIds);

  return rows
    .map((row) => {
      const sections = parseSections(row.sections);
      const artworkId = firstSectionArtworkId(sections);
      const artwork = artworkId ? artworks.get(artworkId) ?? null : null;
      const published_at = safeNullableString(row.published_at);
      const slug = safeTrim(row.slug);
      const title = safeTrim(row.title);

      if (!published_at || !slug || !title) {
        return null;
      }

      return {
        slug,
        title,
        meta_description: safeString(row.meta_description),
        published_at,
        card_image_url: artworkImage(artwork),
      };
    })
    .filter((item): item is BlogPostListItem => item !== null);
}

export async function getPublishedBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const normalizedSlug = safeTrim(slug);
  if (!normalizedSlug) return null;

  try {
    const { data, error } = await supabase
      .from("blog_posts")
      .select(BLOG_POST_COLUMNS)
      .eq("locale", BLOG_LOCALE)
      .eq("status", "published")
      .eq("slug", normalizedSlug)
      .maybeSingle();

    if (error) {
      console.error("[blog] get post:", error.message);
      return null;
    }

    if (!data) return null;

    const row = rowFromDb(data as Record<string, unknown>);
    if (!row || row.status !== "published") return null;

    return hydrateBlogPost(row);
  } catch (err) {
    console.error("[blog] get post exception:", err);
    return null;
  }
}

/** @deprecated Use getPublishedBlogPostBySlug */
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  return getPublishedBlogPostBySlug(slug);
}

export function blogArtworkCaption(artwork: BlogArtwork): string {
  const title = safeTrim(artwork.title) || "Untitled";
  const artist = safeTrim(artwork.artist_display) || "Unknown artist";
  const date = safeNullableString(artwork.date_display);

  if (date) {
    return `${title} — ${artist}, ${date}`;
  }
  return `${title} — ${artist}`;
}

export function blogPostHeroImage(post: BlogPost): string | null {
  for (const section of post.sections) {
    const url = artworkImage(section.artwork);
    if (url) return url;
  }
  return null;
}

export async function getPublishedBlogSlugs(): Promise<string[]> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("locale", BLOG_LOCALE)
    .eq("status", "published");

  if (error) {
    console.error("[blog] slugs:", error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => safeTrim(row.slug))
    .filter((slug): slug is string => !!slug);
}
