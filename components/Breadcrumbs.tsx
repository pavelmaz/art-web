import Link from "next/link";

import { absoluteUrl } from "@/lib/utils";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  /** Pathname of this page (e.g. `/artworks/foo`) for JSON-LD when the last crumb omits `href`. */
  currentPath: string;
};

export function Breadcrumbs({ items, currentPath }: BreadcrumbsProps) {
  const filtered = items.filter((item) => item.label.trim().length > 0);
  if (!filtered.length) {
    return null;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: filtered.map((item, index) => {
      const isLast = index === filtered.length - 1;
      const pathForUrl = item.href ?? (isLast ? currentPath : "/");
      return {
        "@type": "ListItem",
        position: index + 1,
        name: item.label.trim(),
        item: absoluteUrl(pathForUrl),
      };
    }),
  };

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-neutral-600">
        <ol className="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0">
          {filtered.map((item, index) => {
            const isLast = index === filtered.length - 1;
            const showSlash = index < filtered.length - 1;

            return (
              <li key={`${item.label}-${index}`} className="flex items-center gap-x-2">
                {isLast ? (
                  <span className="font-medium text-neutral-900" aria-current="page">
                    {item.label.trim()}
                  </span>
                ) : (
                  <Link
                    href={item.href ?? "/"}
                    className="underline decoration-neutral-400 underline-offset-2 hover:text-neutral-900"
                  >
                    {item.label.trim()}
                  </Link>
                )}
                {showSlash ? <span className="text-neutral-400 select-none">/</span> : null}
              </li>
            );
          })}
        </ol>
      </nav>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
