import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { getArtworksByStyle } from "@/lib/artworks";
import { getStyleBySlug, getStyles } from "@/lib/styles";
import { absoluteUrl } from "@/lib/utils";

type StylePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const styles = await getStyles();
  return styles.map((style) => ({ slug: style.slug }));
}

export async function generateMetadata({ params }: StylePageProps): Promise<Metadata> {
  const { slug } = await params;
  const style = await getStyleBySlug(slug);

  if (!style) {
    return { title: "Style Not Found" };
  }

  return {
    title: `${style.name} Artworks`,
    description:
      style.description ?? `Browse public domain artworks in the ${style.name} style.`,
    alternates: {
      canonical: absoluteUrl(`/styles/${style.slug}`),
    },
  };
}

export default async function StylePage({ params }: StylePageProps) {
  const { slug } = await params;
  const style = await getStyleBySlug(slug);

  if (!style) {
    notFound();
  }

  const artworks = await getArtworksByStyle(slug);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{style.name}</h1>
      {style.description ? <p className="max-w-3xl text-neutral-700">{style.description}</p> : null}
      <ArtworkGrid artworks={artworks} />
    </div>
  );
}
