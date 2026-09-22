import type { Metadata } from "next";

import { CollectionDetailPage } from "@/components/CollectionDetailPage";
import { loadCollectionWorks } from "@/lib/print-collections";
import { collectionAlternates } from "@/lib/print-collections-i18n";

export const revalidate = 86400;

type Props = { params: Promise<{ collection: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { collection } = await params;
  const { name, matched } = await loadCollectionWorks("print", collection);
  if (!name) return {};
  return {
    title: { absolute: `${name} — Free High-Resolution Downloads | Fine Art Free` },
    description: `${matched.length} public domain works from ${name}, free to download in high resolution for personal and commercial use.`,
    alternates: collectionAlternates("print", collection, "en"),
  };
}

export default async function Page({ params }: Props) {
  const { collection } = await params;
  return <CollectionDetailPage hub="print" slugParam={collection} />;
}
