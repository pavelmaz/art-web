import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionPageJsonLd } from "@/components/JsonLd";
import { MuseumProfileHeader } from "@/components/MuseumProfileHeader";
import { Pagination } from "@/components/Pagination";
import { buildMuseumLanguageAlternates } from "@/lib/locale-routes";
import { fetchMuseumArtworks, getMuseumPageData } from "@/lib/museum-page-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 86400;

type MuseumPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: MuseumPageProps): Promise<Metadata> {
  const { slug } = await params;
  const museum = await getMuseumPageData(slug, "en");

  if (!museum) {
    notFound();
  }

  const title = `${museum.name} Collection — Free Art Downloads | Fine Art Free`;
  const description =
    museum.seoDescription ??
    `Explore ${museum.artworkCount} artworks from ${museum.name} free to download. High-resolution public domain art for any purpose.`;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/museums/${slug}`),
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

  const museum = await getMuseumPageData(slug, "en");
  if (!museum) {
    notFound();
  }

  const { artworks, totalCount, error } = await fetchMuseumArtworks(museum.name, from, to);

  if (error) {
    console.error("[museum-primary-query]", error);
    return <p>Error loading data</p>;
  }

  if (!artworks.length) {
    notFound();
  }

  const pageDescription =
    museum.description ??
    `Browse free public domain artworks and paintings from ${museum.name}.`;

  return (
    <div className="space-y-8 px-5">
      <CollectionPageJsonLd
        name={`${museum.name} Collection`}
        path={`/museums/${slug}`}
        description={pageDescription}
        numberOfItems={totalCount}
      />
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Museums", href: "/museums" }, { label: museum.name }]}
        currentPath={`/museums/${slug}`}
      />
      <MuseumProfileHeader
        name={museum.name}
        city={museum.city}
        country={museum.country}
        description={pageDescription}
        readMoreLabel="Read more"
      />
      <p className="text-sm text-[#6b6b6b]">
        {museum.artworkCount} {museum.artworkCount === 1 ? "artwork" : "artworks"}
      </p>
      <ArtworkGrid artworks={artworks} />
      <Pagination
        currentPage={page}
        totalPages={Math.max(1, getTotalPages(totalCount || artworks.length))}
        basePath={`/museums/${slug}`}
      />
    </div>
  );
}
