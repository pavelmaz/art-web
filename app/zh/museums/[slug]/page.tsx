import { buildMuseumLanguageAlternates, localePath } from "@/lib/locale-routes";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionPageJsonLd } from "@/components/JsonLd";
import { MuseumProfileHeader } from "@/components/MuseumProfileHeader";
import { MuseumTopArtists } from "@/components/MuseumTopArtists";
import { Pagination } from "@/components/Pagination";
import { fetchMuseumArtworks, fetchMuseumTopArtists, getMuseumPageData } from "@/lib/museum-page-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { getT } from "@/lib/translations";

export const revalidate = 86400;

const t = getT("zh");
const museumsHubPath = localePath("zh", "museums");

type MuseumPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: MuseumPageProps): Promise<Metadata> {
  const { slug } = await params;
  const museum = await getMuseumPageData(slug, "zh");

  if (!museum) {
    notFound();
  }

  const title = `${museum.name} — 免费博物馆 | Fine Art Free`;
  const description =
    museum.seoDescription ??
    `探索${museum.name}的${museum.artworkCount}件高分辨率作品。公共领域，免费。`;

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

  const museum = await getMuseumPageData(slug, "zh");
  if (!museum) {
    notFound();
  }

  const [{ artworks, totalCount, error }, topArtists] = await Promise.all([
    fetchMuseumArtworks(museum.name, from, to),
    fetchMuseumTopArtists(museum.name),
  ]);

  if (error) {
    console.error("[museum-primary-query/zh]", error);
    return <p>Error loading data</p>;
  }

  if (!artworks.length) {
    notFound();
  }

  const pageDescription =
    museum.description ??
    `免费下载${museum.name}馆藏的高分辨率公有领域绘画和艺术品。`;

  return (
    <div className="space-y-8 px-5">
      <CollectionPageJsonLd
        name={`${museum.name}馆藏`}
        path={`${museumsHubPath}/${slug}`}
        description={pageDescription}
        numberOfItems={totalCount}
      />
      <Breadcrumbs
        items={[{ label: "首页", href: "/zh" }, { label: t.museums, href: museumsHubPath }, { label: museum.name }]}
        currentPath={`${museumsHubPath}/${slug}`}
      />
      <MuseumProfileHeader
        name={museum.name}
        city={museum.city}
        country={museum.country}
        description={pageDescription}
        readMoreLabel="阅读更多"
      />
      <MuseumTopArtists
        artists={topArtists}
        heading={t.topArtists}
        locale="zh"
        artworksLabel={t.artworks}
      />
      <p className="text-sm text-[#6b6b6b]">
        {museum.artworkCount} {t.artworks}
      </p>
      <ArtworkGrid artworks={artworks} basePath="/zh" />
      <Pagination
        currentPage={page}
        totalPages={Math.max(1, getTotalPages(totalCount || artworks.length))}
        basePath={`${museumsHubPath}/${slug}`}
      />
    </div>
  );
}
