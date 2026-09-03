import type { Metadata } from "next";

import { CollectionHubPage } from "@/components/CollectionHubPage";
import { HUB_COPY, hubAlternates } from "@/lib/print-collections-i18n";

export const revalidate = 86400;

const copy = HUB_COPY["pt"];

export const metadata: Metadata = {
  title: { absolute: `${copy.print.heading} — ${copy.downloadsTitle} | Fine Art Free` },
  description: copy.print.intro,
  alternates: hubAlternates("print", "pt"),
  openGraph: { title: copy.print.heading, description: copy.print.intro },
};

export default function Page() {
  return <CollectionHubPage hub="print" locale="pt" />;
}
