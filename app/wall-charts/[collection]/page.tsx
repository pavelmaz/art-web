import type { Metadata } from "next";

import { CollectionDetailPage } from "@/components/CollectionDetailPage";
import { COLLECTION_HUBS, loadCollectionWorks } from "@/lib/print-collections";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 86400;

const cfg = COLLECTION_HUBS["wall-chart"];

type Props = { params: Promise<{ collection: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { collection } = await params;
  const { name, matched } = await loadCollectionWorks("wall-chart", collection);
  if (!name) return {};
  return {
    title: { absolute: `${name} — Free High-Resolution Downloads | Fine Art Free` },
    description: `${matched.length} public domain works from ${name}, free to download in high resolution for personal and commercial use.`,
    alternates: { canonical: absoluteUrl(`${cfg.basePath}/${collection}`) },
  };
}

export default async function Page({ params }: Props) {
  const { collection } = await params;
  return <CollectionDetailPage hub="wall-chart" slugParam={collection} />;
}
