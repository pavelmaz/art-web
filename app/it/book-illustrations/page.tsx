import type { Metadata } from "next";

import { CollectionHubPage } from "@/components/CollectionHubPage";
import { HUB_COPY, hubAlternates } from "@/lib/print-collections-i18n";

export const revalidate = 86400;

const copy = HUB_COPY["it"];

export const metadata: Metadata = {
  title: { absolute: `${copy.book.heading} — ${copy.downloadsTitle} | Fine Art Free` },
  description: copy.book.intro,
  alternates: hubAlternates("book-illustration", "it"),
  openGraph: { title: copy.book.heading, description: copy.book.intro },
};

export default function Page() {
  return <CollectionHubPage hub="book-illustration" locale="it" />;
}
