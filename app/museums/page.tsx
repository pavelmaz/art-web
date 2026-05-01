import Link from "next/link";

import { Pagination } from "@/components/Pagination";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/utils";

type MuseumRow = {
  museum: string | null;
};

type MuseumsPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function MuseumsPage({ searchParams }: MuseumsPageProps) {
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const primaryQuery = await supabase
    .from("artworks")
    .select("museum")
    .not("museum", "is", null)
    .neq("museum", "")
    .order("museum", { ascending: true });

  let rows = (primaryQuery.data as MuseumRow[] | null) ?? [];

  if (primaryQuery.error?.code === "57014") {
    const fallbackQuery = await supabase
      .from("artworks")
      .select("museum")
      .not("museum", "is", null)
      .limit(5000);

    if (fallbackQuery.error) {
      return <p>Error loading data</p>;
    }

    rows = (fallbackQuery.data as MuseumRow[] | null) ?? [];
  } else if (primaryQuery.error) {
    return <p>Error loading data</p>;
  }

  const museums = Array.from(
    new Set(
      rows.map((item) => item.museum?.trim()).filter((museum): museum is string => Boolean(museum))
    )
  ).sort((a, b) => a.localeCompare(b));
  const totalPages = Math.max(1, getTotalPages(museums.length));
  const paginatedMuseums = museums.slice(from, to + 1);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Museums</h1>
      <ul className="space-y-1">
        {paginatedMuseums.map((museum) => (
          <li key={museum}>
            <Link href={`/museums/${slugify(museum)}`} className="underline">
              {museum}
            </Link>
          </li>
        ))}
      </ul>
      <Pagination currentPage={page} totalPages={totalPages} basePath="/museums" />
    </div>
  );
}
