import { blogGenreSlugFromName } from "@/lib/blog-genres";
import { artistDetailPath, artworkDetailPath } from "@/lib/locale-routes";
import { slugify } from "@/lib/utils";

const BLOG_LOCALE = "en" as const;

type StyleSlugLookup = Map<string, string>;

function styleSlugFromName(name: string, styleSlugs: StyleSlugLookup): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const direct = styleSlugs.get(trimmed.toLowerCase());
  if (direct) return direct;

  const bySlugify = styleSlugs.get(slugify(trimmed));
  if (bySlugify) return bySlugify;

  return null;
}

function resolveTokenPath(
  type: string,
  value: string,
  styleSlugs: StyleSlugLookup,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  switch (type) {
    case "artist":
      return artistDetailPath(BLOG_LOCALE, trimmed);
    case "artwork":
      return artworkDetailPath(BLOG_LOCALE, trimmed);
    case "genre": {
      const slug = blogGenreSlugFromName(trimmed);
      return slug ? `/genres/${slug}` : null;
    }
    case "style": {
      const slug = styleSlugFromName(trimmed, styleSlugs);
      return slug ? `/styles/${slug}` : null;
    }
    default:
      return null;
  }
}

function unwrapUnresolvedAnchors(html: string): string {
  return html.replace(
    /<a\s+([^>]*?)href=(["'])\{\{[^}]+\}\}\2([^>]*)>([\s\S]*?)<\/a>/gi,
    "$4",
  );
}

function replaceTokenAnchors(html: string, styleSlugs: StyleSlugLookup): string {
  return html.replace(
    /<a\s+([^>]*?)href=(["'])\{\{(artist|artwork|genre|style):([^}]+)\}\}\2([^>]*)>([\s\S]*?)<\/a>/gi,
    (match, before, quote, type, value, after, text) => {
      const path = resolveTokenPath(type, value, styleSlugs);
      if (!path) return text;
      return `<a ${before}href=${quote}${path}${quote}${after}>${text}</a>`;
    },
  );
}

function replaceBareTokens(html: string, styleSlugs: StyleSlugLookup): string {
  return html.replace(/\{\{(artist|artwork|genre|style):([^}]+)\}\}/g, (match, type, value) => {
    const path = resolveTokenPath(type, value, styleSlugs);
    return path ?? match;
  });
}

/** Strip scripts, event handlers, and disallowed tags from trusted blog HTML. */
export function sanitizeBlogHtml(html: string): string {
  let out = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");

  out = out.replace(
    /<(?!\/?(?:p|a|strong|em|b|i|ul|ol|li|h2|h3|br|blockquote|span)\b)[^>]+>/gi,
    "",
  );

  return out;
}

export function processBlogHtml(html: string, styleSlugs: StyleSlugLookup): string {
  if (!html?.trim()) return "";

  let processed = replaceTokenAnchors(html, styleSlugs);
  processed = replaceBareTokens(processed, styleSlugs);
  processed = unwrapUnresolvedAnchors(processed);
  return sanitizeBlogHtml(processed);
}

export function buildStyleSlugLookup(
  rows: Array<{ name: string; slug: string }>,
): StyleSlugLookup {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (!row.name?.trim() || !row.slug?.trim()) continue;
    map.set(row.name.trim().toLowerCase(), row.slug.trim());
    map.set(slugify(row.name), row.slug.trim());
    map.set(row.slug.trim().toLowerCase(), row.slug.trim());
  }
  return map;
}
