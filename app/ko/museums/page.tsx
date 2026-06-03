import { buildHubLanguageAlternates, canonicalHubUrl } from "@/lib/locale-routes";
import type { Metadata } from "next";

import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getCachedMuseumHub } from "@/lib/cached-hub-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { absoluteUrl, slugify } from "@/lib/utils";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "박물관 컬렉션 — 무료 다운로드 | Fine Art Free",
  description:
    "박물관별 퍼블릭 도메인 예술. 프라도, 릭스뮤지엄, MFA 보스턴, 내셔널 갤러리 등 — 무료 다운로드.",
  alternates: {
    canonical: canonicalHubUrl("ko", "museums"),
    languages: buildHubLanguageAlternates("museums"),
  },
  openGraph: {
    title: "박물관 컬렉션 — 무료 다운로드 | Fine Art Free",
    description:
      "박물관별 퍼블릭 도메인 예술. 프라도, 릭스뮤지엄, MFA 보스턴, 내셔널 갤러리 등 — 무료 다운로드.",
  },
};

type MuseumsPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function MuseumsPage({ searchParams }: MuseumsPageProps) {
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const aggregated = await getCachedMuseumHub();

  const items = aggregated.map((row) => ({
    name: row.display,
    href: `/ko/museums/${slugify(row.display)}`,
    count: row.count,
    imageId: row.image_id,
    url: row.url,
  }));

  const totalPages = Math.max(1, getTotalPages(items.length));
  const paginated = items.slice(from, to + 1);

  return (
    <div className="space-y-8 px-5">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Museos</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">Explorar 작품 de arte por museo</p>
      </div>

      {paginated.length ? <BrowseHubGrid items={paginated} /> : <p className="text-sm text-[#6b6b6b]">No se encontraron 박물관.</p>}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/ko/museums" />
    </div>
  );
}
