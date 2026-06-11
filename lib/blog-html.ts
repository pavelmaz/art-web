import { blogGenreSlugFromName } from "@/lib/blog-genres";
import { safeString, safeTrim } from "@/lib/blog-helpers";
import { artistDetailPath, artworkDetailPath } from "@/lib/locale-routes";
import { slugify } from "@/lib/utils";

const BLOG_LOCALE = "en" as const;

type StyleSlugLookup = Map<string, string>;

function styleSlugFromName(name: unknown, styleSlugs: StyleSlugLookup): string | null {
  const trimmed = safeTrim(name);
  if (!trimmed) return null;

  const direct = styleSlugs.get(trimmed.toLowerCase());
  if (direct) return direct;

  try {
    const bySlugify = styleSlugs.get(slugify(trimmed));
    if (bySlugify) return bySlugify;
  } catch {
    return null;
  }

  return null;
}

function resolveTokenPath(
  type: unknown,
  value: unknown,
  styleSlugs: StyleSlugLookup,
): string | null {
  const tokenType = safeTrim(type);
  const trimmed = safeTrim(value);
  if (!tokenType || !trimmed) return null;

  try {
    switch (tokenType) {
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
  } catch {
    return null;
  }
}

function unwrapUnresolvedAnchors(html: string): string {
  try {
    return html.replace(
      /<a\s+([^>]*?)href=(["'])\{\{[^}]+\}\}\2([^>]*)>([\s\S]*?)<\/a>/gi,
      "$4",
    );
  } catch {
    return html;
  }
}

function replaceTokenAnchors(html: string, styleSlugs: StyleSlugLookup): string {
  try {
    return html.replace(
      /<a\s+([^>]*?)href=(["'])\{\{(artist|artwork|genre|style):([^}]+)\}\}\2([^>]*)>([\s\S]*?)<\/a>/gi,
      (_match, before, quote, type, value, after, text) => {
        const path = resolveTokenPath(type, value, styleSlugs);
        if (!path) return safeString(text);
        return `<a ${before}href=${quote}${path}${quote}${after}>${safeString(text)}</a>`;
      },
    );
  } catch {
    return html;
  }
}

function replaceBareTokens(html: string, styleSlugs: StyleSlugLookup): string {
  try {
    return html.replace(/\{\{(artist|artwork|genre|style):([^}]+)\}\}/g, (match, type, value) => {
      const path = resolveTokenPath(type, value, styleSlugs);
      return path ?? match;
    });
  } catch {
    return html;
  }
}

/** Strip scripts, event handlers, and disallowed tags from trusted blog HTML. */
export function sanitizeBlogHtml(html: string): string {
  try {
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
  } catch {
    return "";
  }
}

export function processBlogHtml(html: unknown, styleSlugs: StyleSlugLookup): string {
  const input = safeString(html);
  if (!input.trim()) return "";

  try {
    let processed = replaceTokenAnchors(input, styleSlugs);
    processed = replaceBareTokens(processed, styleSlugs);
    processed = unwrapUnresolvedAnchors(processed);
    return sanitizeBlogHtml(processed);
  } catch {
    return sanitizeBlogHtml(input);
  }
}

export function buildStyleSlugLookup(
  rows: Array<{ name: unknown; slug: unknown }>,
): StyleSlugLookup {
  const map = new Map<string, string>();
  for (const row of rows) {
    const name = safeTrim(row.name);
    const slug = safeTrim(row.slug);
    if (!name || !slug) continue;

    map.set(name.toLowerCase(), slug);
    try {
      map.set(slugify(name), slug);
    } catch {
      // ignore un-slugifiable names
    }
    map.set(slug.toLowerCase(), slug);
  }
  return map;
}
