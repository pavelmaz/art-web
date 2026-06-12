import type { Metadata } from "next";
import { topicsCountriesPageMetadata } from "@/lib/topics-countries-seo";
import Image from "next/image";
import Link from "next/link";

import { Pagination } from "@/components/Pagination";
import { getCachedCountriesHub } from "@/lib/cached-hub-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { artworkImageUrl } from "@/lib/utils";

export const revalidate = 86400;

export async function generateMetadata({ searchParams }: CountriesPageProps): Promise<Metadata> {
  const { page } = await searchParams;
  return topicsCountriesPageMetadata({
    canonicalPath: "/countries",
    kind: "countries",
    title: "Art by Country — Free Public Domain Downloads | Fine Art Free",
    description: "Browse public domain art by country of origin. French, Dutch, Italian, German paintings and more — all free to download.",
    page,
    openGraph: {
    title: "Art by Country — Free Public Domain Downloads | Fine Art Free",
    description:
      "Browse public domain art by country of origin. French, Dutch, Italian, German paintings and more — all free to download.",
  },
  });
}


const EXCLUDED_WORDS = ["museum", "gallery", "institute", "collection", "university", "library", "foundation", "society", "academy"];

function isInstitutionName(name: string): boolean {
  const lower = name.toLowerCase();
  return EXCLUDED_WORDS.some((word) => lower.includes(word));
}

type CountriesPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function CountriesPage({ searchParams }: CountriesPageProps) {
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const hubCountries = await getCachedCountriesHub();

  const allCountries = hubCountries
    .filter((row) => row.count >= 100 && !isInstitutionName(row.display))
    .map((row) => ({
      name: row.display,
      count: row.count,
      slug: row.display.toLowerCase().replace(/\s+/g, "-"),
      imageUrl: row.image_id || row.url ? artworkImageUrl({ url: row.url, image_id: row.image_id }) : null,
    }))
    .sort((a, b) => b.count - a.count);

  const totalPages = Math.max(1, getTotalPages(allCountries.length));
  const paginated = allCountries.slice(from, to + 1);

  const paginatedWithImages = paginated;

  return (
    <div className="space-y-8 px-5">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Countries</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">Browse artworks by country of origin</p>
      </div>

      {paginatedWithImages.length ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          {paginatedWithImages.map((item) => (
            <Link key={item.slug} href={`/countries/${item.slug}`}>
              <div className="group relative aspect-square cursor-pointer overflow-hidden">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    unoptimized
                    className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full bg-[#f0ede8]" />
                )}
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.75)_0%,rgba(0,0,0,0.1)_60%)]" />
                <div className="absolute bottom-0 left-0 p-3">
                  <p className="text-sm font-semibold text-white">{item.name}</p>
                  <p className="mt-0.5 text-xs text-white/70">
                    {item.count} {item.count === 1 ? "artwork" : "artworks"}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#6b6b6b]">No countries found.</p>
      )}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/countries" />
    </div>
  );
}
