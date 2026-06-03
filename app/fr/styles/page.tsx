import { buildHubLanguageAlternates, canonicalHubUrl } from "@/lib/locale-routes";
import type { Metadata } from "next";

import { BrowseHubGrid, type BrowseHubItem } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getCachedStylesHubData } from "@/lib/cached-hub-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { supabase } from "@/lib/supabase";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Movimientos y Estilos Artísticos — Descarga Gratuita | Fine Art Free",
  description:
    "Explora arte de dominio público por movimiento. Barroco, Impresionismo, Siglo de Oro Holandés, Renacimiento y más — gratis para descargar.",
  alternates: {
    canonical: canonicalHubUrl("fr", "styles"),
    languages: buildHubLanguageAlternates("styles"),
  },
  openGraph: {
    title: "Movimientos y Estilos Artísticos — Descarga Gratuita | Fine Art Free",
    description:
      "Explora arte de dominio público por movimiento. Barroco, Impresionismo, Siglo de Oro Holandés, Renacimiento y más — gratis para descargar.",
  },
};

type StylesPageProps = {
  searchParams: Promise<{ page?: string }>;
};

type LocalizedStyleRow = {
  name: string;
  name_fr: string | null;
  slug: string;
  slug_fr: string | null;
  description_fr: string | null;
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
    .select("name, name_fr, slug, slug_fr, description_fr")
    .order("name", { ascending: true });

  const stylesByName = new Map(
    ((localizedStyles as LocalizedStyleRow[] | null) ?? []).map((s) => [s.name.toLowerCase(), s])
  );

  const byLower = new Map(agg.map((a) => [a.display.toLowerCase(), a]));

  if (!stylesByName.size) {
    return <p className="text-sm text-[#6b6b6b]">No se pudieron cargar los estilos.</p>;
  }

  const hubItems: BrowseHubItem[] = Array.from(stylesByName.values()).map((s) => {
    const a = byLower.get(s.name.toLowerCase());
    const displayName = s.name_fr?.trim() || s.name;
    const linkSlug = s.slug_fr?.trim() || s.slug;
    return {
      name: displayName,
      href: `/fr/styles/${linkSlug}`,
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

      {paginated.length ? (
        <BrowseHubGrid items={paginated} />
      ) : (
        <p className="text-sm text-[#6b6b6b]">No se encontraron estilos.</p>
      )}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/fr/styles" />
    </div>
  );
}
