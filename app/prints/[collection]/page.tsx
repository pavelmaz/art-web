import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { supabase } from "@/lib/supabase";
import { absoluteUrl, slugify } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

export const revalidate = 86400;

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
  collection: string | null;
};

type Props = { params: Promise<{ collection: string }> };

/**
 * The works inside one print collection. `collection` is stored as the museum's
 * own series title, so the slug is matched by slugifying candidates rather than
 * by a reverse lookup — the same approach /genres/[slug] uses.
 */
async function loadCollection(slugParam: string) {
  const { data } = await supabase
    .from("artworks")
    .select(
      "id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score, alt_text, collection"
    )
    .eq("object_type", "print")
    .order("score", { ascending: false });

  const rows = (data as Row[] | null) ?? [];
  const isCatchAll = slugParam === slugify("Individual prints");
  const matched = rows.filter((r) =>
    isCatchAll ? !r.collection?.trim() : slugify(r.collection ?? "") === slugParam
  );
  const name = isCatchAll ? "Individual prints" : matched[0]?.collection?.trim() ?? null;
  return { matched, name };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { collection } = await params;
  const { name, matched } = await loadCollection(collection);
  if (!name) return {};
  return {
    title: `${name} — Free High-Resolution Prints | Fine Art Free`,
    description: `${matched.length} public domain prints from ${name}, free to download in high resolution for personal and commercial use.`,
    alternates: { canonical: absoluteUrl(`/prints/${collection}`) },
  };
}

export default async function PrintCollectionPage({ params }: Props) {
  const { collection } = await params;
  const { matched, name } = await loadCollection(collection);
  if (!name || matched.length === 0) notFound();

  const artworks: Artwork[] = matched.map((item) => ({
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

  return (
    <div className="space-y-8 px-5">
      <div>
        <Link href="/prints" className="text-sm text-[#6b6b6b] underline-offset-2 hover:underline">
          ← Print collections
        </Link>
        <h1 className="mb-2 mt-2 text-2xl font-semibold">{name}</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">
          {artworks.length === 1 ? "1 work" : `${artworks.length} works`} · free to download in
          high resolution
        </p>
      </div>

      <ArtworkGrid artworks={artworks} />
    </div>
  );
}
