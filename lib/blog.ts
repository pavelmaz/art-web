import { buildStyleSlugLookup, processBlogHtml } from "@/lib/blog-html";
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

function parseSections(raw: unknown): BlogSection[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const heading = typeof row.heading === "string" ? row.heading : "";
      const html = typeof row.html === "string" ? row.html : "";
      const artwork_id =
        typeof row.artwork_id === "string" && row.artwork_id.trim()
          ? row.artwork_id.trim()
          : null;
      if (!heading && !html) return null;
      return { heading, html, artwork_id };
    })
    .filter((section): section is BlogSection => section !== null);
}

async function fetchArtworksByIds(ids: string[]): Promise<Map<string, BlogArtwork>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();

  const { data, error } = await supabase.from("artworks").select(ARTWORK_COLUMNS).in("id", unique);

  if (error) {
    console.error("[blog] fetch artworks:", error.message);
    return new Map();
  }

  const map = new Map<string, BlogArtwork>();
  for (const row of data ?? []) {
    if (!row.id || !row.slug || !row.title) continue;
    map.set(row.id, {
      id: row.id,
      slug: row.slug,
      title: row.title,
      artist_display: row.artist_display?.trim() || "Unknown artist",
      date_display: row.date_display,
      image_id: row.image_id,
      url: row.url,
      alt_text: row.alt_text,
    });
  }
  return map;
}

async function getStyleSlugLookup() {
  const { data, error } = await supabase.from("styles").select("name, slug");
  if (error) {
    console.error("[blog] fetch styles:", error.message);
    return buildStyleSlugLookup([]);
  }
  return buildStyleSlugLookup((data ?? []) as Array<{ name: string; slug: string }>);
}

function artworkImage(artwork: BlogArtwork | null): string | null {
  if (!artwork) return null;
  const url = artworkImageUrl({ image_id: artwork.image_id, url: artwork.url });
  return url || null;
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
  if (typeof data.slug !== "string" || typeof data.title !== "string") return null;

  return {
    id: String(data.id ?? ""),
    slug: data.slug,
    locale: typeof data.locale === "string" ? data.locale : BLOG_LOCALE,
    title: data.title,
    meta_title: typeof data.meta_title === "string" ? data.meta_title : data.title,
    meta_description: typeof data.meta_description === "string" ? data.meta_description : "",
    intro_html: typeof data.intro_html === "string" ? data.intro_html : "",
    conclusion_html: typeof data.conclusion_html === "string" ? data.conclusion_html : "",
    sections: parseSections(data.sections),
    status: data.status === "draft" ? "draft" : "published",
    published_at: typeof data.published_at === "string" ? data.published_at : null,
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
      const published_at =
        typeof row.published_at === "string" ? row.published_at : null;
      if (!published_at || typeof row.slug !== "string" || typeof row.title !== "string") {
        return null;
      }

      return {
        slug: row.slug,
        title: row.title,
        meta_description:
          typeof row.meta_description === "string" ? row.meta_description : "",
        published_at,
        card_image_url: artworkImage(artwork),
      };
    })
    .filter((item): item is BlogPostListItem => item !== null);
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("locale", BLOG_LOCALE)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[blog] get post:", error.message);
    return null;
  }

  if (!data) return null;

  const row = rowFromDb(data as Record<string, unknown>);
  if (!row) return null;

  return hydrateBlogPost(row);
}

export function blogArtworkCaption(artwork: BlogArtwork): string {
  const date = artwork.date_display?.trim();
  if (date) {
    return `${artwork.title} — ${artwork.artist_display}, ${date}`;
  }
  return `${artwork.title} — ${artwork.artist_display}`;
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
    .map((row) => (typeof row.slug === "string" ? row.slug : null))
    .filter((slug): slug is string => !!slug);
}
