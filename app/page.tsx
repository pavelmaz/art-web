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
    <div>
      <section
        className="relative w-full bg-[#1a1a1a] bg-cover bg-center py-24"
        style={{ backgroundImage: "url('/hero-bg.png')" }}
      >
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-white">Discover Public Domain Art</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[#d0d0d0]">
            Browse and download thousands of museum masterpieces, free for personal and commercial
            use
          </p>
        </div>
      </section>

      <section className="w-full border-b border-[#e8e6e1] bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap">
            <Link href="/artworks" className="inline-block px-5 py-4 text-sm text-[#6b6b6b] hover:text-[#1a1a1a]">
              Artworks
            </Link>
            <Link href="/styles" className="inline-block px-5 py-4 text-sm text-[#6b6b6b] hover:text-[#1a1a1a]">
              Styles
            </Link>
            <Link href="/genres" className="inline-block px-5 py-4 text-sm text-[#6b6b6b] hover:text-[#1a1a1a]">
              Genres
            </Link>
            <Link href="/artists" className="inline-block px-5 py-4 text-sm text-[#6b6b6b] hover:text-[#1a1a1a]">
              Artists
            </Link>
            <Link href="/museums" className="inline-block px-5 py-4 text-sm text-[#6b6b6b] hover:text-[#1a1a1a]">
              Museums
            </Link>
          </div>
        </div>
      </section>

      <section className="w-full bg-[#faf9f7] py-12">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="mb-8 text-xl font-semibold text-[#1a1a1a]">Featured Artworks</h2>
          <ArtworkGrid artworks={artworks} />
        </div>
      </section>
    </div>
  );
}
