import type { Metadata } from "next";

import { BrowseHubGrid, type BrowseHubItem } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getCachedStylesHubData } from "@/lib/cached-hub-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { slugify } from "@/lib/utils";

export const revalidate = 86400;

type StyleRow = {
  name: string;
  slug: string;
  description: string | null;
};

export const metadata: Metadata = {
  title: "Art Movements & Styles — Free Downloads | Fine Art Free",
  description:
    "Browse public domain art by movement. Baroque, Impressionism, Dutch Golden Age, Renaissance and more — all free to download.",
  alternates: {
    canonical: "https://fineartfree.com/styles",
  },
  openGraph: {
    title: "Art Movements & Styles — Free Downloads | Fine Art Free",
    description:
      "Browse public domain art by movement. Baroque, Impressionism, Dutch Golden Age, Renaissance and more — all free to download.",
  },
};

type StylesPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function StylesPage({ searchParams }: StylesPageProps) {
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  let agg;
  let tableStyles: StyleRow[];
  try {
    const data = await getCachedStylesHubData();
    agg = data.agg;
    tableStyles = data.styles;
  } catch {
    return <p>Error loading data</p>;
  }

  const byLower = new Map(agg.map((a) => [a.display.toLowerCase(), a]));

  let hubItems: BrowseHubItem[];

  if (tableStyles.length) {
    hubItems = tableStyles.map((s) => {
      const a = byLower.get(s.name.toLowerCase());
      return {
        name: s.name,
        href: `/styles/${s.slug}`,
        count: a?.count ?? 0,
        imageId: a?.image_id ?? null,
        url: a?.url ?? null,
      };
    });
    hubItems.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });
  } else {
    hubItems = agg.map((a) => ({
      name: a.display,
      href: `/styles/${slugify(a.display)}`,
      count: a.count,
      imageId: a.image_id,
      url: a.url,
    }));
  }

  const totalPages = Math.max(1, getTotalPages(hubItems.length));
  const paginated = hubItems.slice(from, to + 1);

  return (
    <div className="space-y-8 px-5">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Styles</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">Browse artworks by style</p>
      </div>

      {paginated.length ? <BrowseHubGrid items={paginated} /> : <p className="text-sm text-[#6b6b6b]">No styles found.</p>}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/styles" />
    </div>
  );
}
