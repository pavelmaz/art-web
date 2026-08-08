import type { Metadata } from "next";

import { BrowseHubGrid, type BrowseHubItem } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getCachedStylesHubData } from "@/lib/cached-hub-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { hubListPageMetadata } from "@/lib/list-page-metadata";
import { supabase } from "@/lib/supabase";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 86400;

export async function generateMetadata({ searchParams }: StylesPageProps): Promise<Metadata> {
  const { page } = await searchParams;
  return hubListPageMetadata({
    canonicalPath: "/pt/estilos",
    hub: "styles",
    title: { absolute: "Movimentos e Estilos Artísticos — Download Gratuito | Fine Art Free" },
    description: "Explore arte de domínio público por movimento. Barroco, Impressionismo, Idade de Ouro Holandesa, Renascimento e mais — grátis para baixar.",
    page,
    openGraph: {
    title: "Movimentos e Estilos Artísticos — Download Gratuito | Fine Art Free",
    description:
      "Explore arte de domínio público por movimento. Barroco, Impressionismo, Idade de Ouro Holandesa, Renascimento e mais — grátis para baixar.",
  },
  });
}


type StylesPageProps = {
  searchParams: Promise<{ page?: string }>;
};

type LocalizedStyleRow = {
  name: string;
  name_pt: string | null;
  slug: string;
  slug_pt: string | null;
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
    .select("name, name_pt, slug, slug_pt")
    .order("name", { ascending: true });

  const stylesByName = new Map(
    ((localizedStyles as LocalizedStyleRow[] | null) ?? [])
      .map((s) => [s.name.toLowerCase(), s])
  );

  const byLower = new Map(agg.map((a) => [a.display.toLowerCase(), a]));

  if (!stylesByName.size) {
    return <p className="text-sm text-[#6b6b6b]">Não foi possível carregar os estilos.</p>;
  }

  const hubItems: BrowseHubItem[] = Array.from(stylesByName.values()).map((s) => {
    const a = byLower.get(s.name.toLowerCase());
    const displayName = s.name_pt?.trim() || s.name;
    const linkSlug = s.slug_pt?.trim() || s.slug;
    return {
      name: displayName,
      href: `/pt/estilos/${linkSlug}`,
      count: a?.count ?? 0,
      imageId: a?.image_id ?? null,
      url: a?.url ?? null,
    };
  });
  hubItems.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name);
  });

  const totalPages = Math.max(1, getTotalPages(hubItems.length));
  const paginated = hubItems.slice(from, to + 1);

  return (
    <div className="space-y-8 px-5">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Estilos</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">Explorar obras de arte por estilo</p>
      </div>

      {paginated.length ? <BrowseHubGrid items={paginated} /> : <p className="text-sm text-[#6b6b6b]">Nenhum estilo encontrado.</p>}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/pt/estilos" />
    </div>
  );
}
