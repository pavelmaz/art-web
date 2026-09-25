/**
 * Reviews shown on the framed-print page. Only real reviews from customers who
 * bought a print go here — never placeholders or invented ones (the page shows
 * an empty state until the first one arrives).
 */
export type PrintReview = {
  /** Artwork slug the review is for. */
  artworkSlug: string;
  /** 1–5 stars. */
  rating: number;
  text: string;
  /** As the customer agreed to be shown, e.g. "Sarah K." */
  name: string;
  /** ISO date the review was left. */
  date: string;
  /** What they bought, e.g. `16" × 20", black frame`. */
  purchased?: string;
};

const REVIEWS: PrintReview[] = [];

export function reviewsFor(artworkSlug: string): { item: PrintReview[]; all: PrintReview[] } {
  return { item: REVIEWS.filter((r) => r.artworkSlug === artworkSlug), all: REVIEWS };
}
