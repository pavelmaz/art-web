export const PAGE_SIZE = 30;

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
