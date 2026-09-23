import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PrintProductPage } from "@/components/PrintProductPage";
import { supabase } from "@/lib/supabase";
import { artworkDetailImageUrl, artworkMeetsCanvasMinRes } from "@/lib/utils";

export const revalidate = 86400;

// Not an SEO page — purely transactional, reached only by clicking "Order
// Canvas Print" from the artwork page. See the print-on-demand plan.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type PrintPageProps = {
  params: Promise<{ slug: string }>;
};

type ArtworkRow = {
  id: string;
  slug: string;
  title: string;
  artist_display: string | null;
  url: string | null;
  image_id: string | null;
  img_width: number | null;
  img_height: number | null;
};

export default async function ArtworkPrintPage({ params }: PrintPageProps) {
  const { slug } = await params;

  const { data: artwork, error } = await supabase
    .from("artworks")
    .select("id, slug, title, artist_display, url, image_id, img_width, img_height")
    .eq("slug", slug)
    .single<ArtworkRow>();

  // Server-side enforcement of the same gate the entry point on the main
  // artwork page already applies (Van Gogh + a resolution floor so a low-res
  // scan can't be sold as a full-size print) — this page's URL is guessable,
  // the entry point hiding the link isn't enough on its own.
  if (error || !artwork || artwork.artist_display !== "Vincent van Gogh" || !artworkMeetsCanvasMinRes(artwork)) {
    notFound();
  }

  const imageUrl = artworkDetailImageUrl(artwork);

  return <PrintProductPage artworkSlug={artwork.slug} title={artwork.title} imageUrl={imageUrl} />;
}
