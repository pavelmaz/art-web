import { buildHubLanguageAlternates, canonicalHubUrl } from "@/lib/locale-routes";
import type { Metadata } from "next";

import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getArtistsHubPage } from "@/lib/cached-hub-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { absoluteUrl, slugify } from "@/lib/utils";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: { absolute: "Художники — Все работы бесплатно | Fine Art Free" },
  description:
    "Искусство по художникам. Моне, Рембрандт, Ван Гог, Дюрер и сотни других — бесплатная загрузка.",
  alternates: {
    canonical: canonicalHubUrl("ru", "artists"),
    languages: buildHubLanguageAlternates("artists"),
  },
  openGraph: {
    title: "Художники — Все работы бесплатно | Fine Art Free",
    description:
      "Искусство по художникам. Моне, Рембрандт, Ван Гог, Дюрер и сотни других — бесплатная загрузка.",
  },
};

type ArtistsPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function ArtistsPage({ searchParams }: ArtistsPageProps) {
  const resolvedSearchParams = await searchParams;
  const { page } = getPaginationParams(resolvedSearchParams);

  const { artists, totalCount } = await getArtistsHubPage(page);
  const totalPages = Math.max(1, getTotalPages(totalCount));

  return (
    <div className="space-y-8 px-5">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Художники</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">Работы по художникам</p>
      </div>

      {artists.length ? (
        <BrowseHubGrid
          items={artists.map((artist) => ({
            name: artist.artistName,
            href: `/ru/artists/${slugify(artist.artistName)}`,
            count: artist.count,
            imageId: artist.image_id,
            url: artist.url,
          }))}
        />
      ) : (
        <p className="text-sm text-[#6b6b6b]">Художники не найдены.</p>
      )}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/ru/artists" />
    </div>
  );
}
