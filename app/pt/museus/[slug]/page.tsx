import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionPageJsonLd } from "@/components/JsonLd";
import { MuseumProfileHeader } from "@/components/MuseumProfileHeader";
import { MuseumTopArtists } from "@/components/MuseumTopArtists";
import { Pagination } from "@/components/Pagination";
import { buildMuseumLanguageAlternates } from "@/lib/locale-routes";
import { fetchMuseumArtworks, fetchMuseumTopArtists, getMuseumPageData } from "@/lib/museum-page-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { getT } from "@/lib/translations";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 86400;

const t = getT("pt");

type MuseumPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: MuseumPageProps): Promise<Metadata> {
  const { slug } = await params;
  const museum = await getMuseumPageData(slug, "pt");

  if (!museum) {
    notFound();
  }

  const title = `${museum.name} — Arte Grátis para Baixar | Fine Art Free`;
  const description =
    museum.seoDescription ??
    `Baixe ${museum.artworkCount} obras de arte de ${museum.name} grátis. Pinturas de domínio público em alta resolução para qualquer uso.`;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/pt/museus/${slug}`),
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

  const museum = await getMuseumPageData(slug, "pt");
  if (!museum) {
    notFound();
  }

  const [{ artworks, totalCount, error }, topArtists] = await Promise.all([
    fetchMuseumArtworks(museum.name, from, to),
    fetchMuseumTopArtists(museum.name),
  ]);

  if (error) {
    console.error("[museum-primary-query/pt]", error);
    return <p>Error loading data</p>;
  }

  if (!artworks.length) {
    notFound();
  }

  const pageDescription =
    museum.description ??
    `Explore obras de arte e pinturas de domínio público do ${museum.name}, grátis para baixar.`;

  return (
    <div className="space-y-8 px-5">
      <CollectionPageJsonLd
        name={`Coleção do ${museum.name}`}
        path={`/pt/museus/${slug}`}
        description={pageDescription}
        numberOfItems={totalCount}
      />
      <Breadcrumbs
        items={[{ label: "Início", href: "/pt" }, { label: "Museus", href: "/pt/museus" }, { label: museum.name }]}
        currentPath={`/pt/museus/${slug}`}
      />
      <MuseumProfileHeader
        name={museum.name}
        city={museum.city}
        country={museum.country}
        description={pageDescription}
        readMoreLabel="Ler mais"
      />
      <MuseumTopArtists artists={topArtists} heading={t.topArtists} locale="pt" />
      <p className="text-sm text-[#6b6b6b]">
        {museum.artworkCount} {museum.artworkCount === 1 ? "obra de arte" : "obras de arte"}
      </p>
      <ArtworkGrid artworks={artworks} basePath="/pt" />
      <Pagination
        currentPage={page}
        totalPages={Math.max(1, getTotalPages(totalCount || artworks.length))}
        basePath={`/pt/museus/${slug}`}
      />
    </div>
  );
}
