import { buildMuseumLanguageAlternates, localePath } from "@/lib/locale-routes";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionPageJsonLd } from "@/components/JsonLd";
import { MuseumProfileHeader } from "@/components/MuseumProfileHeader";
import { Pagination } from "@/components/Pagination";
import { fetchMuseumArtworks, getMuseumPageData } from "@/lib/museum-page-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { getT } from "@/lib/translations";

export const revalidate = 86400;

const t = getT("it");
const museumsHubPath = localePath("it", "museums");

type MuseumPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: MuseumPageProps): Promise<Metadata> {
  const { slug } = await params;
  const museum = await getMuseumPageData(slug, "it");

  if (!museum) {
    notFound();
  }

  const title = `${museum.name} — Musei gratuiti | Fine Art Free`;
  const description =
    museum.seoDescription ??
    `Scopri ${museum.artworkCount} opere da ${museum.name} in alta risoluzione. Dominio pubblico, gratuito.`;

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

  const museum = await getMuseumPageData(slug, "it");
  if (!museum) {
    notFound();
  }

  const { artworks, totalCount, error } = await fetchMuseumArtworks(museum.name, from, to);

  if (error) {
    console.error("[museum-primary-query/it]", error);
    return <p>Error loading data</p>;
  }

  if (!artworks.length) {
    notFound();
  }

  const pageDescription =
    museum.description ??
    `Scopri ${museum.artworkCount} opere e dipinti di pubblico dominio del ${museum.name}, gratis da scaricare.`;

  return (
    <div className="space-y-8 px-5">
      <CollectionPageJsonLd
        name={`Collezione del ${museum.name}`}
        path={`${museumsHubPath}/${slug}`}
        description={pageDescription}
        numberOfItems={totalCount}
      />
      <Breadcrumbs
        items={[{ label: "Home", href: "/it" }, { label: t.museums, href: museumsHubPath }, { label: museum.name }]}
        currentPath={`${museumsHubPath}/${slug}`}
      />
      <MuseumProfileHeader
        name={museum.name}
        city={museum.city}
        country={museum.country}
        description={pageDescription}
        readMoreLabel="Leggi di più"
      />
      <p className="text-sm text-[#6b6b6b]">
        {museum.artworkCount} {t.artworks}
      </p>
      <ArtworkGrid artworks={artworks} basePath="/it" />
      <Pagination
        currentPage={page}
        totalPages={Math.max(1, getTotalPages(totalCount || artworks.length))}
        basePath={`${museumsHubPath}/${slug}`}
      />
    </div>
  );
}
