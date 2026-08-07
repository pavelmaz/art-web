import type { Metadata } from "next";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { Pagination } from "@/components/Pagination";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { supabase } from "@/lib/supabase";
import { absoluteUrl, slugify } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

export const revalidate = 86400;

/**
 * Browse surface for `object_type = 'print'` — etchings, engravings, lithographs
 * and woodblock prints, kept separate from the painting-led /artworks so neither
 * dilutes the other. The column is indexed partially (object_type is not null),
 * so this never scans the 109k paintings.
 */
export const metadata: Metadata = {
  title: "Prints — Free High-Resolution Public Domain Downloads | Fine Art Free",
  description:
    "Browse public domain prints — etchings, engravings, lithographs and woodblock prints — free to download in high resolution for personal and commercial use.",
  alternates: { canonical: absoluteUrl("/prints") },
};

type PrintsPageProps = { searchParams: Promise<{ page?: string }> };

type Row = {
  id: string;
  title: string | null;
  slug: string | null;
  artist_display: string | null;
  image_id: string | null;
  url: string | null;
  museum: string | null;
  style_title: string | null;
  genre_title: string | null;
  score: number | null;
  alt_text: string | null;
};

export default async function PrintsPage({ searchParams }: PrintsPageProps) {
  const resolved = await searchParams;
  const { page, from, to } = getPaginationParams(resolved);

  const { data, count, error } = await supabase
    .from("artworks")
    .select(
      "id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score, alt_text",
      { count: "exact" }
    )
    .eq("object_type", "print")
    .order("score", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[PrintsPage]", error);
    return <p className="px-5">Error loading prints</p>;
  }

  const rows = (data as Row[] | null) ?? [];
  const artworks: Artwork[] = rows.map((item) => ({
    id: item.id,
    slug: item.slug ?? item.id,
    title: item.title ?? "",
    artistName: item.artist_display ?? "",
    artistDisplay: item.artist_display ?? undefined,
    imageUrl: item.image_id ?? "",
    imageId: item.image_id,
    museum: item.museum,
    styleTitle: item.style_title,
    genreTitle: item.genre_title,
    score: item.score,
    url: item.url,
    sourceUrl: item.url ?? undefined,
    altText: item.alt_text,
    styleSlug: item.style_title ? slugify(item.style_title) : "",
    styleName: item.style_title ?? "",
  }));

  const totalPages = Math.max(1, getTotalPages(count ?? 0));

  return (
    <div className="space-y-8 px-5">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Prints</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">
          Etchings, engravings, lithographs and woodblock prints — scanned at full
          plate size and free to download.
          {count ? ` ${count.toLocaleString()} works.` : ""}
        </p>
      </div>

      <ArtworkGrid artworks={artworks} />

      <Pagination currentPage={page} totalPages={totalPages} basePath="/prints" />
    </div>
  );
}
