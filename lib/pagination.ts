import { notFound } from "next/navigation";

export const PAGE_SIZE = 90;

export function getPaginationParams(searchParams: { page?: string }) {
  const parsed = Number.parseInt(searchParams.page ?? "1", 10);
  const page = Number.isNaN(parsed) ? 1 : Math.max(1, parsed);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  return { page, from, to };
}

export function getTotalPages(count: number) {
  return Math.ceil(count / PAGE_SIZE);
}

/**
 * Total pages for a list, and a hard stop when the request is past the end.
 *
 * Every hub used to answer `?page=<anything>` with HTTP 200: an empty grid, a
 * self-referencing canonical and the page-1 title. That is an unbounded space
 * of thin duplicates, and Search Console named exactly those URLs
 * (/museums?page=2, ?page=3 — the hub has 83 entries, so one real page) as the
 * referrers for "crawled, currently not indexed". Out of range is now a 404.
 */
export function pagesOrNotFound(page: number, count: number): number {
  const totalPages = Math.max(1, getTotalPages(count));
  if (page > totalPages) notFound();
  return totalPages;
}
