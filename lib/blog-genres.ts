import { slugify } from "@/lib/utils";

/** Genre slug → display title (matches app/genres/[slug]/page.tsx GENRE_MAP). */
export const BLOG_GENRE_MAP: Record<string, string> = {
  landscape: "Landscape",
  marine: "Marine",
  architecture: "Architecture",
  "genre-scene": "Genre Scene",
  religious: "Religious",
  portrait: "Portrait",
  figurative: "Figurative",
  "decorative-art": "Decorative Art",
  historical: "Historical",
  interior: "Interior",
  botanical: "Botanical",
  abstract: "Abstract",
  animal: "Animal",
  "still-life": "Still Life",
  mythology: "Mythology",
  allegory: "Allegory",
  drawing: "Drawing",
  illustration: "Illustration",
};

const GENRE_BY_TITLE = new Map(
  Object.entries(BLOG_GENRE_MAP).map(([slug, title]) => [title.toLowerCase(), slug]),
);

export function blogGenreSlugFromName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const byTitle = GENRE_BY_TITLE.get(trimmed.toLowerCase());
  if (byTitle) return byTitle;

  const slug = slugify(trimmed);
  return slug && Object.prototype.hasOwnProperty.call(BLOG_GENRE_MAP, slug) ? slug : null;
}
