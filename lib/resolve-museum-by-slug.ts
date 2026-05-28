import { getCachedMuseumHub } from "@/lib/cached-hub-data";
import { slugify } from "@/lib/utils";

/**
 * Resolve URL slug to the canonical `artworks.museum` value (accents, casing).
 * Hub links use slugify(display); unslugify alone cannot round-trip (e.g. São → Sao).
 */
export async function resolveMuseumBySlug(slug: string): Promise<string | null> {
  const target = slug.trim().toLowerCase();
  if (!target) {
    return null;
  }

  const hub = await getCachedMuseumHub();
  const match = hub.find((row) => {
    const name = row.display?.trim();
    if (!name) {
      return false;
    }
    return slugify(name) === target;
  });

  return match?.display?.trim() ?? null;
}
