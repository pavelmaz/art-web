import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getArtworkBySlug } from "@/lib/artworks";
import { absoluteUrl } from "@/lib/utils";

type ArtworkPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ArtworkPageProps): Promise<Metadata> {
  const { slug } = await params;
  const artwork = await getArtworkBySlug(slug);

  if (!artwork) {
    return { title: "Artwork Not Found" };
  }

  return {
    title: artwork.title,
    description:
      artwork.description ??
      `${artwork.title} by ${artwork.artistName} in the ${artwork.styleName} style.`,
    alternates: {
      canonical: absoluteUrl(`/artworks/${artwork.slug}`),
    },
  };
}

export default async function ArtworkDetailPage({ params }: ArtworkPageProps) {
  const { slug } = await params;
  const artwork = await getArtworkBySlug(slug);

  if (!artwork) {
    notFound();
  }

  return (
    <article className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">{artwork.title}</h1>
      <p className="text-neutral-700">
        {artwork.artistName} · {artwork.dateDisplay ?? "Unknown date"} · {artwork.styleName}
      </p>
      {artwork.description ? <p className="max-w-3xl text-neutral-800">{artwork.description}</p> : null}
    </article>
  );
}
