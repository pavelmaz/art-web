import Link from "next/link";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  basePath: string;
};

function pageHref(basePath: string, page: number): string {
  if (page <= 1) {
    return basePath;
  }
  return `${basePath}?page=${page}`;
}

function buildPageItems(currentPage: number, totalPages: number): Array<number | "..."> {
  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  for (let page = currentPage - 2; page <= currentPage + 2; page += 1) {
    if (page >= 1 && page <= totalPages) {
      pages.add(page);
    }
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const items: Array<number | "..."> = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const page = sorted[i];
    const prev = sorted[i - 1];
    if (typeof prev === "number" && page - prev > 1) {
      items.push("...");
    }
    items.push(page);
  }
  return items;
}

export function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const items = buildPageItems(currentPage, totalPages);
  const isPrevDisabled = currentPage <= 1;
  const isNextDisabled = currentPage >= totalPages;

  return (
    <nav aria-label="Pagination" className="mb-8 mt-12 flex justify-center gap-1">
      {isPrevDisabled ? (
        <span className="rounded-md px-3 py-2 text-sm text-[#b3b3b3]">Previous</span>
      ) : (
        <Link href={pageHref(basePath, currentPage - 1)} className="rounded-md px-3 py-2 text-sm text-[#6b6b6b] hover:text-[#1a1a1a]">
          Previous
        </Link>
      )}

      {items.map((item, index) =>
        item === "..." ? (
          <span key={`ellipsis-${index}`} className="rounded-md px-3 py-2 text-sm text-[#b3b3b3]">
            ...
          </span>
        ) : item === currentPage ? (
          <span key={item} className="rounded-md bg-[#1a1a1a] px-3 py-2 text-sm text-white">
            {item}
          </span>
        ) : (
          <Link key={item} href={pageHref(basePath, item)} className="rounded-md px-3 py-2 text-sm text-[#6b6b6b] hover:text-[#1a1a1a]">
            {item}
          </Link>
        )
      )}

      {isNextDisabled ? (
        <span className="rounded-md px-3 py-2 text-sm text-[#b3b3b3]">Next</span>
      ) : (
        <Link href={pageHref(basePath, currentPage + 1)} className="rounded-md px-3 py-2 text-sm text-[#6b6b6b] hover:text-[#1a1a1a]">
          Next
        </Link>
      )}
    </nav>
  );
}
