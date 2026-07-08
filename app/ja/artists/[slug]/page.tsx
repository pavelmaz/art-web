import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArtistProfileHeader } from "@/components/ArtistProfileHeader";
import { ArtworkGrid } from "@/components/ArtworkGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArtistJsonLd } from "@/components/JsonLd";
import { Pagination } from "@/components/Pagination";
import { getArtistBioForLocale, getArtistProfileBySlug } from "@/lib/get-artist-profile";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { buildArtistLanguageAlternates } from "@/lib/locale-routes";
import { supabase } from "@/lib/supabase";
import { absoluteUrl, artworkGridImageUrl } from "@/lib/utils";
import { getT } from "@/lib/translations";
import type { Artwork } from "@/types/artwork";

export const revalidate = 86400;

const t = getT("ja");

type ArtistPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

type ArtworkRow = {
  id: string;
  title: string;
  slug: string;
  artist_display: string | null;
  image_id: string | null;
  url: string | null;
  museum: string | null;
  style_title: string | null;
  genre_title: string | null;
  score: number | null;
  alt_text: string | null;
};

export async function generateMetadata({ params }: ArtistPageProps): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtistProfileBySlug(slug);

  if (!artist?.name) {
    notFound();
  }

  const totalCount = artist.artwork_count ?? 0;
  if (!totalCount) {
    notFound();
  }

  const title = t.artistPageTitle(artist.name);
  const description = `${artist.name}の作品を${totalCount}点、高解像度で無料ダウンロード。パブリックドメインの美術作品です。`;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/ja/artists/${slug}`),
      languages: buildArtistLanguageAlternates(slug),
    },
    openGraph: {
      title,
      description,
      images: artist.image_url ? [{ url: artist.image_url }] : undefined,
    },
  };
}

export default async function ArtistPage({ params, searchParams }: ArtistPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const artist = await getArtistProfileBySlug(slug);
  if (!artist?.name) {
    notFound();
  }

  const artistName = artist.name;

  const { data, error } = await supabase
    .from("artworks")
    .select(
      "id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score, alt_text",
    )
    .eq("artist_display", artistName)
    .order("score", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[ArtistPage/ja]", slug, artistName, error);
    return <p>Error loading data</p>;
  }

  const rows = (data as ArtworkRow[] | null) ?? [];
  if (!rows.length) {
    notFound();
  }

  const artworkCount = artist.artwork_count ?? rows.length;
  const bio = getArtistBioForLocale(artist, "ja");

  const artworks: Artwork[] = rows.map((item) => ({
    id: item.id,
    title: item.title,
    slug: item.slug,
    artistName: item.artist_display ?? artistName,
    artistDisplay: item.artist_display ?? undefined,
    imageUrl: artworkGridImageUrl({ url: item.url, image_id: item.image_id }),
    imageId: item.image_id,
    museum: item.museum,
    styleTitle: item.style_title,
    genreTitle: item.genre_title,
    score: item.score,
    url: item.url,
    styleSlug: "unknown",
    styleName: item.style_title ?? "Unknown style",
    sourceUrl: item.url ?? undefined,
    altText: item.alt_text ?? null,
  }));

  return (
    <div className="space-y-8 px-5">
      <ArtistJsonLd
        name={artistName}
        slug={slug}
        nationality={artist.nationality}
        birthYear={artist.birth_year}
        deathYear={artist.death_year}
        description={bio}
        imageUrl={artist.image_url}
      />
      <Breadcrumbs
        items={[{ label: "ホーム", href: "/ja" }, { label: t.artists, href: "/ja/artists" }, { label: artistName }]}
        currentPath={`/ja/artists/${slug}`}
      />
      <ArtistProfileHeader
        name={artistName}
        imageUrl={artist.image_url}
        fallbackArtwork={{ image_id: rows[0].image_id, url: rows[0].url }}
        nationality={artist.nationality}
        birthYear={artist.birth_year}
        deathYear={artist.death_year}
        bio={bio}
        readMoreLabel="もっと読む"
      />
      <p className="text-sm text-[#6b6b6b]">
        {artworkCount} {t.artworks}
      </p>
      <ArtworkGrid artworks={artworks} basePath="/ja" />
      <Pagination
        currentPage={page}
        totalPages={Math.max(1, getTotalPages(artworkCount))}
        basePath={`/ja/artists/${slug}`}
      />
    </div>
  );
}
