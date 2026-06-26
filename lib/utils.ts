export function formatYear(year?: number): string {
  return year ? String(year) : "Unknown year";
}

export function absoluteUrl(path: string): string {
  let baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  if (!/^https?:\/\//i.test(baseUrl)) {
    baseUrl = `https://${baseUrl.replace(/^\/+/, "")}`;
  }
  return new URL(path, baseUrl).toString();
}

export function slugify(value: string): string {
  const accentMap: Record<string, string> = {
    à: "a",
    á: "a",
    â: "a",
    ã: "a",
    ä: "a",
    å: "a",
    æ: "ae",
    ç: "c",
    è: "e",
    é: "e",
    ê: "e",
    ë: "e",
    ì: "i",
    í: "i",
    î: "i",
    ï: "i",
    ð: "d",
    ñ: "n",
    ò: "o",
    ó: "o",
    ô: "o",
    õ: "o",
    ö: "o",
    ø: "o",
    ù: "u",
    ú: "u",
    û: "u",
    ü: "u",
    ý: "y",
    þ: "th",
    ÿ: "y",
    ß: "ss",
    À: "a",
    Á: "a",
    Â: "a",
    Ã: "a",
    Ä: "a",
    Å: "a",
    Æ: "ae",
    Ç: "c",
    È: "e",
    É: "e",
    Ê: "e",
    Ë: "e",
    Ì: "i",
    Í: "i",
    Î: "i",
    Ï: "i",
    Ð: "d",
    Ñ: "n",
    Ò: "o",
    Ó: "o",
    Ô: "o",
    Õ: "o",
    Ö: "o",
    Ø: "o",
    Ù: "u",
    Ú: "u",
    Û: "u",
    Ü: "u",
    Ý: "y",
    Þ: "th",
    Ÿ: "y",
  };

  let str = value;
  str = str
    .split("")
    .map((c) => accentMap[c] || c)
    .join("");

  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Compare URL segments to `styles.slug` when DB uses underscores and routes use hyphens (e.g. art-deco vs art_deco). */
export function normalizeSlugForMatch(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/-+/g, "-");
}

/** Values to try when resolving a style row by path slug. */
export function styleSlugLookupVariants(raw: string): string[] {
  const t = raw.trim();
  if (!t) return [];
  const hyphen = normalizeSlugForMatch(t);
  const under = hyphen.replace(/-/g, "_");
  return Array.from(new Set([t, hyphen, under]));
}

type ArtworkImageSource = {
  url: string | null;
  image_id: string | null;
};

function toImageUrl(imageId: string | null): string {
  if (!imageId) {
    return "";
  }

  if (imageId.startsWith("http://") || imageId.startsWith("https://")) {
    return imageId;
  }

  return `https://www.artic.edu/iiif/2/${imageId}/full/800,/0/default.jpg`;
}

function isLikelyImageUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    const pathname = parsed.pathname.toLowerCase();

    if (/\.(jpg|jpeg|png|webp|gif|avif|svg)$/.test(pathname)) {
      return true;
    }

    // Common image delivery patterns (e.g. IIIF endpoints without extensions).
    return pathname.includes("/iiif/") || pathname.includes("/image/");
  } catch {
    return false;
  }
}

function isBlockedDirectImageHost(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "mdl.artvee.com";
  } catch {
    return false;
  }
}

function optimizeImageUrl(url: string, quality: number = 80, width: number = 800): string {
  if (url.includes("supabase.co/storage")) {
    // Strip any existing render params that may be in the URL
    return url.split("?")[0];
  }
  if (url.includes("upload.wikimedia.org") && /\/\d+px-/.test(url)) {
    return url.replace(/\/\d+px-/, `/${width}px-`);
  }
  if (url.includes("artic.edu/iiif/") && /\/full\/\d+,\//.test(url)) {
    return url.replace(/\/full\/\d+,\//, `/full/${width},/`);
  }
  return url;
}

export const ARTWORK_GRID_IMAGE_QUALITY = 80;
export const ARTWORK_HERO_IMAGE_QUALITY = 90;
export const ARTWORK_GRID_IMAGE_WIDTH = 800;
export const ARTWORK_HERO_IMAGE_WIDTH = 1600;

/**
 * Pre-generated WebP renditions live in the `art-images` bucket under
 * `renditions/<variant>/…`, produced by scripts/generate-image-renditions.mjs.
 * Keys/widths here MUST stay in sync with that script. Renditions are only served
 * when NEXT_PUBLIC_USE_IMAGE_RENDITIONS=1, so the switch can be flipped after the
 * backfill completes (default off = original full-size behaviour, unchanged).
 */
export const IMAGE_RENDITIONS = {
  grid: "w800",
  detail: "w1400",
} as const;
export type ImageRendition = keyof typeof IMAGE_RENDITIONS;

const USE_IMAGE_RENDITIONS = process.env.NEXT_PUBLIC_USE_IMAGE_RENDITIONS === "1";
const SUPABASE_PUBLIC_MARKER = "/object/public/art-images/";

/**
 * Map a Supabase public original URL to its pre-generated WebP rendition.
 * Returns null for non-Supabase URLs (e.g. artic.edu/IIIF) or already-rendition URLs,
 * so the caller falls back to its normal optimized URL.
 */
function supabaseRenditionUrl(url: string, rendition: ImageRendition): string | null {
  const idx = url.indexOf(SUPABASE_PUBLIC_MARKER);
  if (idx === -1) {
    return null;
  }
  const prefixEnd = idx + SUPABASE_PUBLIC_MARKER.length;
  const prefix = url.slice(0, prefixEnd); // …/object/public/art-images/
  const objectPath = url.slice(prefixEnd).split("?")[0]; // artworks/<hash>.jpg
  // Renditions were only generated under the `artworks/` tree. For any other path
  // (e.g. `artists/` portraits, which have no rendition) return null so the caller
  // falls back to the original — otherwise the constructed URL 404s (broken image).
  if (!objectPath || !objectPath.startsWith("artworks/")) {
    return null;
  }
  const webpPath = objectPath.replace(/\.[a-z0-9]+$/i, ".webp");
  return `${prefix}renditions/${IMAGE_RENDITIONS[rendition]}/${webpPath}`;
}

/** Optional image CDN (e.g. Cloudflare-cached `cdn.fineartfree.com`) that proxies Supabase Storage. */
const IMAGE_CDN_HOST = process.env.NEXT_PUBLIC_IMAGE_CDN_HOST?.trim();

/** Route Supabase Storage URLs through the image CDN when configured; leave other hosts untouched. */
function cdnRewrite(url: string): string {
  if (!IMAGE_CDN_HOST || !url) {
    return url;
  }
  return url.replace(/^https:\/\/[a-z0-9-]+\.supabase\.co\//i, `https://${IMAGE_CDN_HOST}/`);
}

export type ArtworkImageUrlOptions = {
  /** JPEG/WebP quality for Supabase `/render/image/` URLs (1–100). Ignored for other hosts. */
  quality?: number;
  /** Max width in pixels for resized delivery (Supabase render, IIIF, Wikimedia). */
  width?: number;
  /** Serve a pre-generated rendition instead of the full-size original (Supabase-hosted images only). */
  rendition?: ImageRendition;
};

export function artworkImageUrl(artwork: ArtworkImageSource, options?: ArtworkImageUrlOptions): string {
  const quality = options?.quality ?? ARTWORK_GRID_IMAGE_QUALITY;
  const width = options?.width ?? ARTWORK_GRID_IMAGE_WIDTH;
  // Default to a rendition so a bare call never serves the multi-MB original. The full
  // master file is only ever exposed deliberately via artworkOriginalUrl (Pro download).
  const rendition = options?.rendition ?? "grid";

  // ALWAYS use image_id first - our Supabase storage
  const fromImageId = toImageUrl(artwork.image_id);
  if (fromImageId && !isBlockedDirectImageHost(fromImageId)) {
    if (USE_IMAGE_RENDITIONS) {
      const renditionUrl = supabaseRenditionUrl(fromImageId, rendition);
      if (renditionUrl) {
        return cdnRewrite(renditionUrl);
      }
    }
    return cdnRewrite(optimizeImageUrl(fromImageId, quality, width));
  }

  // Fallback to url only if no image_id
  const rawUrl = artwork.url?.trim();
  if (rawUrl && isLikelyImageUrl(rawUrl) && !isBlockedDirectImageHost(rawUrl)) {
    if (USE_IMAGE_RENDITIONS) {
      const renditionUrl = supabaseRenditionUrl(rawUrl, rendition);
      if (renditionUrl) {
        return cdnRewrite(renditionUrl);
      }
    }
    return cdnRewrite(optimizeImageUrl(rawUrl, quality, width));
  }

  return "";
}

/** Grid / card previews — 80% quality for faster loads. */
export function artworkGridImageUrl(artwork: ArtworkImageSource): string {
  return artworkImageUrl(artwork, {
    quality: ARTWORK_GRID_IMAGE_QUALITY,
    width: ARTWORK_GRID_IMAGE_WIDTH,
    rendition: "grid",
  });
}

/** Detail-page hero preview — 90% quality (not master file; use artworkOriginalUrl for download). */
export function artworkDetailImageUrl(artwork: ArtworkImageSource): string {
  return artworkImageUrl(artwork, {
    quality: ARTWORK_HERO_IMAGE_QUALITY,
    width: ARTWORK_HERO_IMAGE_WIDTH,
    rendition: "detail",
  });
}

export function artworkOriginalUrl(artwork: ArtworkImageSource): string {
  const rawUrl = artwork.url?.trim();
  if (rawUrl && isLikelyImageUrl(rawUrl) && !isBlockedDirectImageHost(rawUrl)) {
    return cdnRewrite(rawUrl);
  }
  const id = artwork.image_id;
  if (!id) return "";
  if (id.startsWith("http://") || id.startsWith("https://")) {
    return isBlockedDirectImageHost(id) ? "" : cdnRewrite(id);
  }
  return `https://www.artic.edu/iiif/2/${id}/full/1200,/0/default.jpg`;
}

export function generateAltText(artwork: {
  title: string | null;
  date_display: string | null;
  artist_display: string | null;
  medium_display: string | null;
}): string {
  const parts = [
    artwork.title,
    artwork.date_display,
    artwork.artist_display ? `by ${artwork.artist_display}` : null,
    artwork.medium_display,
    "public domain",
  ].filter(Boolean);
  return parts.join(", ");
}
