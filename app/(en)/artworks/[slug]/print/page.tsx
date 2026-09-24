import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PrintProductPage } from "@/components/PrintProductPage";
import { supabase } from "@/lib/supabase";
import { canSellPrint } from "@/lib/print-catalog";
import { artworkDetailImageUrl } from "@/lib/utils";

export const revalidate = 86400;

// Not an SEO page — purely transactional, reached only by clicking "Order
// Framed Print" from the artwork page. See the print-on-demand plan.
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

  // Same gate as the button on the artwork page — this URL is guessable, so
  // hiding the link isn't enough on its own.
  if (error || !artwork || !canSellPrint(artwork)) {
    notFound();
  }

  const imageUrl = artworkDetailImageUrl(artwork);

  return (
    <PrintProductPage
      artworkSlug={artwork.slug}
      title={artwork.title}
      artist={artwork.artist_display}
      imageUrl={imageUrl}
      imgWidth={artwork.img_width!}
      imgHeight={artwork.img_height!}
    />
  );
}
