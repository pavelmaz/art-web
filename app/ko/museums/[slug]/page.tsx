import { buildMuseumLanguageAlternates, localePath } from "@/lib/locale-routes";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionPageJsonLd } from "@/components/JsonLd";
import { MuseumGuideBanner } from "@/components/MuseumGuideBanner";
import { MuseumProfileHeader } from "@/components/MuseumProfileHeader";
import { MuseumTopArtists } from "@/components/MuseumTopArtists";
import { Pagination } from "@/components/Pagination";
import { fetchMuseumArtworks, fetchMuseumTopArtists, getMuseumPageData } from "@/lib/museum-page-data";
import { getPaginationParams, pagesOrNotFound } from "@/lib/pagination";
import { getT } from "@/lib/translations";

export const revalidate = 86400;

const t = getT("ko");
const museumsHubPath = localePath("ko", "museums");

type MuseumPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: MuseumPageProps): Promise<Metadata> {
  const { slug } = await params;
  const museum = await getMuseumPageData(slug, "ko");

  if (!museum) {
    notFound();
  }

  const title = `${museum.name} — 무료 박물관 | Fine Art Free`;
  const description =
    museum.seoDescription ??
    `${museum.name}의 작품 ${museum.artworkCount}점을 고해상도로 무료 다운로드하세요. 퍼블릭 도메인 작품입니다.`;

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: `https://fineartfree.com${museumsHubPath}/${slug}`,
      languages: buildMuseumLanguageAlternates(slug),
    },
    openGraph: {
      title,
      description,
    },
  };
}

export default async function MuseumPage({ params, searchParams }: MuseumPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const museum = await getMuseumPageData(slug, "ko");
  if (!museum) {
    notFound();
  }

  const [{ artworks, totalCount, error }, topArtists] = await Promise.all([
    fetchMuseumArtworks(museum.name, from, to),
    fetchMuseumTopArtists(museum.name),
  ]);

  if (error) {
    console.error("[museum-primary-query/ko]", error);
    return <p>Error loading data</p>;
  }

  if (!artworks.length) {
    notFound();
  }

  const pageDescription =
    museum.description ??
    `${museum.name} 소장 퍼블릭 도메인 작품을 고해상도로 무료 다운로드할 수 있습니다.`;

  return (
    <div className="space-y-8 px-5">
      <CollectionPageJsonLd
        name={`${museum.name} 컬렉션`}
        path={`${museumsHubPath}/${slug}`}
        description={pageDescription}
        numberOfItems={totalCount}
      />
      <Breadcrumbs
        items={[{ label: "홈", href: "/ko" }, { label: t.museums, href: museumsHubPath }, { label: museum.name }]}
        currentPath={`${museumsHubPath}/${slug}`}
      />
      <MuseumProfileHeader
        name={museum.name}
        city={museum.city}
        country={museum.country}
        description={pageDescription}
        readMoreLabel="더 읽기"
      />
      <MuseumGuideBanner museumSlug={slug} museumName={museum.name} locale="ko" />
      <MuseumTopArtists artists={topArtists} heading={t.topArtists} locale="ko" />
      <p className="text-sm text-[#6b6b6b]">
        {museum.artworkCount} {t.artworks}
      </p>
      <ArtworkGrid artworks={artworks} basePath="/ko" />
      <Pagination
        currentPage={page}
        totalPages={pagesOrNotFound(page, totalCount || artworks.length)}
        basePath={`${museumsHubPath}/${slug}`}
      />
    </div>
  );
}
