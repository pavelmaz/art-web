import { buildHubLanguageAlternates, canonicalHubUrl } from "@/lib/locale-routes";
import type { Metadata } from "next";
import { hubListPageMetadata } from "@/lib/list-page-metadata";

import { BrowseHubGrid, type BrowseHubItem } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getCachedStylesHubData } from "@/lib/cached-hub-data";
import { getPaginationParams, pagesOrNotFound } from "@/lib/pagination";
import { supabase } from "@/lib/supabase";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 86400;

export async function generateMetadata({ searchParams }: StylesPageProps): Promise<Metadata> {
  const { page } = await searchParams;
  return hubListPageMetadata({
    canonicalPath: "/it/styles",
    hub: "styles",
    title: { absolute: "Stili e movimenti artistici — Download gratuito | Fine Art Free" },
    description: "Arte per stile. Barocco, impressionismo, Secolo d'oro olandese, Rinascimento e altro — gratis da scaricare.",
    page,
    openGraph: {
    title: "Stili e movimenti artistici — Download gratuito | Fine Art Free",
    description:
      "Arte per stile. Barocco, impressionismo, Secolo d'oro olandese, Rinascimento e altro — gratis da scaricare.",
  },
  });
}


type StylesPageProps = {
  searchParams: Promise<{ page?: string }>;
};

type LocalizedStyleRow = {
  name: string;
  name_it: string | null;
  slug: string;
  slug_it: string | null;
  description_it: string | null;
};

export default async function StylesPage({ searchParams }: StylesPageProps) {
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  let agg;
  try {
    const data = await getCachedStylesHubData();
    agg = data.agg;
  } catch {
    return <p>Error loading data</p>;
  }

  const { data: localizedStyles } = await supabase
    .from("styles")
    .select("name, name_it, slug, slug_it, description_it")
    .order("name", { ascending: true });

  const stylesByName = new Map(
    ((localizedStyles as LocalizedStyleRow[] | null) ?? []).map((s) => [s.name.toLowerCase(), s])
  );

  const byLower = new Map(agg.map((a) => [a.display.toLowerCase(), a]));

  if (!stylesByName.size) {
    return <p className="text-sm text-[#6b6b6b]">Impossibile caricare gli stili.</p>;
  }

  const hubItems: BrowseHubItem[] = Array.from(stylesByName.values()).map((s) => {
    const a = byLower.get(s.name.toLowerCase());
    const displayName = s.name_it?.trim() || s.name;
    const linkSlug = s.slug_it?.trim() || s.slug;
    return {
      name: displayName,
      href: `/it/styles/${linkSlug}`,
      count: a?.count ?? 0,
      imageId: a?.image_id ?? null,
      url: a?.url ?? null,
    };
  });
  hubItems.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name);
  });

  const totalPages = pagesOrNotFound(page, hubItems.length);
  const paginated = hubItems.slice(from, to + 1);

  return (
    <div className="space-y-8 px-5">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Stili</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">Esplora opere per stile</p>
      </div>

      {paginated.length ? (
        <BrowseHubGrid items={paginated} />
      ) : (
        <p className="text-sm text-[#6b6b6b]">Nessuno stile trovato.</p>
      )}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/it/styles" />
    </div>
  );
}
