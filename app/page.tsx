import Link from "next/link";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { supabase } from "@/lib/supabase";
import type { Artwork } from "@/types/artwork";

function toImageUrl(imageId: string | null): string {
  if (!imageId) {
    return "";
  }

  if (imageId.startsWith("http://") || imageId.startsWith("https://")) {
    return imageId;
  }

  return `https://www.artic.edu/iiif/2/${imageId}/full/843,/0/default.jpg`;
}

export default async function HomePage() {
  const orderedQuery = await supabase
    .from("artworks")
    .select("id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score")
    .order("score", { ascending: false })
    .limit(12);

  let rows = orderedQuery.data ?? [];

  if (orderedQuery.error?.code === "57014") {
    const fallbackQuery = await supabase
      .from("artworks")
      .select("id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score")
      .limit(300);

    if (fallbackQuery.error) {
      return <p>Error loading data</p>;
    }

    rows = (fallbackQuery.data ?? []).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 12);
  } else if (orderedQuery.error) {
    return <p>Error loading data</p>;
  }

  const artworks: Artwork[] = rows.map((item) => ({
    id: item.id,
    title: item.title,
    slug: item.slug,
    artistName: item.artist_display ?? "Unknown artist",
    artistDisplay: item.artist_display ?? undefined,
    imageUrl: toImageUrl(item.image_id),
    imageId: item.image_id,
    museum: item.museum,
    styleTitle: item.style_title,
    genreTitle: item.genre_title,
    score: item.score,
    url: item.url,
    styleSlug: "unknown",
    styleName: item.style_title ?? "Unknown style",
    sourceUrl: item.url ?? undefined,
  }));

  if (!artworks.length) {
    return <p>No artworks found</p>;
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Free Public Domain Artworks</h1>
        <p className="max-w-3xl text-neutral-700">
          Explore timeless paintings, illustrations, and museum masterpieces available in the
          public domain.
        </p>
      </section>

      <section className="flex flex-wrap gap-4">
        <Link href="/artworks" className="underline">
          Artworks
        </Link>
        <Link href="/styles" className="underline">
          Styles
        </Link>
        <Link href="/genres" className="underline">
          Genres
        </Link>
        <Link href="/artists" className="underline">
          Artists
        </Link>
        <Link href="/museums" className="underline">
          Museums
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight">Featured Artworks</h2>
        <ArtworkGrid artworks={artworks} />
      </section>
    </div>
  );
}
