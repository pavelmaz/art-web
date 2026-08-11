import type { Metadata } from "next";

import { CollectionHubPage } from "@/components/CollectionHubPage";
import { COLLECTION_HUBS } from "@/lib/print-collections";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 86400;

const cfg = COLLECTION_HUBS["book-illustration"];

export const metadata: Metadata = {
  title: { absolute: cfg.metaTitle },
  description: cfg.metaDescription,
  alternates: { canonical: absoluteUrl(cfg.basePath) },
};

export default function Page() {
  return <CollectionHubPage hub="book-illustration" />;
}
