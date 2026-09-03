import type { Metadata } from "next";

import { CollectionHubPage } from "@/components/CollectionHubPage";
import { COLLECTION_HUBS } from "@/lib/print-collections";
import { hubAlternates } from "@/lib/print-collections-i18n";

export const revalidate = 86400;

const cfg = COLLECTION_HUBS["book-illustration"];

export const metadata: Metadata = {
  title: { absolute: cfg.metaTitle },
  description: cfg.metaDescription,
  alternates: hubAlternates("book-illustration", "en"),
};

export default function Page() {
  return <CollectionHubPage hub="book-illustration" />;
}
