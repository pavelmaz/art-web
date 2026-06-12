import type { Metadata } from "next";

import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getCachedMuseumHub } from "@/lib/cached-hub-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { hubListPageMetadata } from "@/lib/list-page-metadata";
import { absoluteUrl, slugify } from "@/lib/utils";
import { getT } from "@/lib/translations";

export const revalidate = 86400;

const t = getT("ja");

export async function generateMetadata({ searchParams }: MuseumsPageProps): Promise<Metadata> {
  const { page } = await searchParams;
  return hubListPageMetadata({
    canonicalPath: "/ja/museums",
    hub: "museums",
    title: "美術館コレクション — パブリックドメイン無料 | Fine Art Free",
    description: "プラド美術館、ライクスミュージアム、ボストン美術館、ナショナル・ギャラリーなど、世界の美術館所蔵のパブリックドメイン作品を無料ダウンロード。",
    page,
    openGraph: {
    title: "美術館コレクション — パブリックドメイン無料 | Fine Art Free",
    description:
      "プラド美術館、ライクスミュージアム、ボストン美術館、ナショナル・ギャラリーなど、世界の美術館所蔵のパブリックドメイン作品を無料ダウンロード。",
  },
  });
}


type MuseumsPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function MuseumsPage({ searchParams }: MuseumsPageProps) {
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const aggregated = await getCachedMuseumHub();

  const items = aggregated.map((row) => ({
    name: row.display,
    href: `/ja/museums/${slugify(row.display)}`,
    count: row.count,
    imageId: row.image_id,
    url: row.url,
  }));

  const totalPages = Math.max(1, getTotalPages(items.length));
  const paginated = items.slice(from, to + 1);

  return (
    <div className="space-y-8 px-5">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">{t.museums}</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">美術館別に作品を探す</p>
      </div>

      {paginated.length ? <BrowseHubGrid items={paginated} /> : <p className="text-sm text-[#6b6b6b]">美術館が見つかりません。</p>}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/ja/museums" />
    </div>
  );
}
