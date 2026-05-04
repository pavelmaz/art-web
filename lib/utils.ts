export function formatYear(year?: number): string {
  return year ? String(year) : "Unknown year";
}

export function absoluteUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return new URL(path, baseUrl).toString();
}
<<<<<<< HEAD

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
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

  return `https://www.artic.edu/iiif/2/${imageId}/full/1200,/0/default.jpg`;
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

export function artworkImageUrl(artwork: ArtworkImageSource): string {
  const rawUrl = artwork.url?.trim();
  if (rawUrl && isLikelyImageUrl(rawUrl)) {
    return rawUrl;
  }
  return toImageUrl(artwork.image_id);
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
=======
>>>>>>> 42d7ea5 (initial commit)
