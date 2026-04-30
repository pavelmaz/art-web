import type { Metadata } from "next";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { getArtworks } from "@/lib/artworks";

export const metadata: Metadata = {
  title: "All Artworks",
  description:
    "Browse all public domain artworks in our searchable, SEO-optimized gallery.",
};

export default async function ArtworksPage() {
  const artworks = await getArtworks();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">All Artworks</h1>
      <p className="text-neutral-700">
        A complete index of public domain artworks, structured for crawlability and fast load
        times.
      </p>
      <ArtworkGrid artworks={artworks} />
    </div>
  );
}
