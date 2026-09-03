import type { Metadata } from "next";

import { CollectionDetailPage } from "@/components/CollectionDetailPage";
import { loadCollectionWorks } from "@/lib/print-collections";
import { HUB_COPY, collectionAlternates } from "@/lib/print-collections-i18n";

export const revalidate = 86400;

type Props = { params: Promise<{ collection: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { collection } = await params;
  const { name, matched } = await loadCollectionWorks("book-illustration", collection, "fr");
  if (!name) return {};
  const copy = HUB_COPY["fr"];
  const title = `${name} — ${copy.downloadsTitle} | Fine Art Free`;
  const description = `${name} — ${copy.worksCount(matched.length)}, ${copy.freeHiRes}.`;
  return {
    title: { absolute: title },
    description,
    alternates: collectionAlternates("book-illustration", collection, "fr"),
    openGraph: { title, description },
  };
}

export default async function Page({ params }: Props) {
  const { collection } = await params;
  return <CollectionDetailPage hub="book-illustration" slugParam={collection} locale="fr" />;
}
