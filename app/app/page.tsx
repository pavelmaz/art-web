import type { Metadata } from "next";
import Link from "next/link";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { getArtworks } from "@/lib/artworks";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Discover iconic public domain paintings and illustrations in a fast, SEO-focused online gallery.",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const artworks = await getArtworks();
  const featuredArtworks = artworks.slice(0, 6);

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Public Domain Art Gallery</h1>
        <p className="max-w-3xl text-neutral-700">
          Explore a curated collection of public domain masterpieces organized for search
          visibility and easy browsing.
        </p>
        <Link href="/artworks" className="inline-block text-sm font-medium underline">
          View all artworks
        </Link>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Featured Works</h2>
        <ArtworkGrid artworks={featuredArtworks} />
      </section>
    </div>
  );
}
