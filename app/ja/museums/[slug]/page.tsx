import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionPageJsonLd } from "@/components/JsonLd";
import { MuseumProfileHeader } from "@/components/MuseumProfileHeader";
import { Pagination } from "@/components/Pagination";
import { artistDetailPath, buildMuseumLanguageAlternates } from "@/lib/locale-routes";
import { fetchMuseumArtworks, fetchMuseumTopArtists, getMuseumPageData } from "@/lib/museum-page-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { getT } from "@/lib/translations";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 86400;

const t = getT("ja");

type MuseumPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: MuseumPageProps): Promise<Metadata> {
  const { slug } = await params;
  const museum = await getMuseumPageData(slug, "ja");

  if (!museum) {
    notFound();
  }

  const title = `${museum.name} — パブリックドメイン無料ダウンロード | Fine Art Free`;
  const description =
    museum.seoDescription ??
    `${museum.name}のコレクションから作品を${museum.artworkCount}点、高解像度で無料ダウンロード。パブリックドメイン作品です。`;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/ja/museums/${slug}`),
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

  const museum = await getMuseumPageData(slug, "ja");
  if (!museum) {
    notFound();
  }

  const [{ artworks, totalCount, error }, topArtists] = await Promise.all([
    fetchMuseumArtworks(museum.name, from, to),
    fetchMuseumTopArtists(museum.name),
  ]);

  if (error) {
    console.error("[museum-primary-query/ja]", error);
    return <p>Error loading data</p>;
  }

  if (!artworks.length) {
    notFound();
  }

  const pageDescription =
    museum.description ??
    `${museum.name}所蔵のパブリックドメイン作品を無料で高解像度ダウンロードできます。`;

  return (
    <div className="space-y-8 px-5">
      <CollectionPageJsonLd
        name={`${museum.name}のコレクション`}
        path={`/ja/museums/${slug}`}
        description={pageDescription}
        numberOfItems={totalCount}
      />
      <Breadcrumbs
        items={[{ label: "ホーム", href: "/ja" }, { label: t.museums, href: "/ja/museums" }, { label: museum.name }]}
        currentPath={`/ja/museums/${slug}`}
      />
      <MuseumProfileHeader
        name={museum.name}
        city={museum.city}
        country={museum.country}
        description={pageDescription}
        readMoreLabel="もっと読む"
      />
      {topArtists.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold tracking-tight text-[#1a1a1a]">{t.topArtists}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {topArtists.map((artist) => (
              <Link
                key={artist.slug}
                href={artistDetailPath("ja", artist.slug)}
                className="rounded-full bg-neutral-100 px-3 py-1.5 text-sm text-[#1a1a1a] hover:bg-neutral-200"
              >
                {artist.name} ({artist.count})
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      <p className="text-sm text-[#6b6b6b]">
        {museum.artworkCount} {t.artworks}
      </p>
      <ArtworkGrid artworks={artworks} basePath="/ja" />
      <Pagination
        currentPage={page}
        totalPages={Math.max(1, getTotalPages(totalCount || artworks.length))}
        basePath={`/ja/museums/${slug}`}
      />
    </div>
  );
}
