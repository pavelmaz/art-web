import type { Metadata } from "next";

import { BrowseHubGrid, type BrowseHubItem } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getCachedStylesHubData } from "@/lib/cached-hub-data";
import { getPaginationParams, pagesOrNotFound } from "@/lib/pagination";
import { hubListPageMetadata } from "@/lib/list-page-metadata";
import { supabase } from "@/lib/supabase";
import { absoluteUrl } from "@/lib/utils";
import { getT } from "@/lib/translations";

export const revalidate = 86400;

const t = getT("ja");

export async function generateMetadata({ searchParams }: StylesPageProps): Promise<Metadata> {
  const { page } = await searchParams;
  return hubListPageMetadata({
    canonicalPath: "/ja/styles",
    hub: "styles",
    title: { absolute: "スタイル・美術運動 — パブリックドメイン無料 | Fine Art Free" },
    description: "バロック、印象派、オランダ黄金時代、ルネサンスなど、スタイル別にパブリックドメインの名作を無料で高解像度ダウンロード。",
    page,
    openGraph: {
    title: "スタイル・美術運動 — パブリックドメイン無料 | Fine Art Free",
    description:
      "バロック、印象派、オランダ黄金時代、ルネサンスなど、スタイル別にパブリックドメインの名作を無料で高解像度ダウンロード。",
  },
  });
}


type StylesPageProps = {
  searchParams: Promise<{ page?: string }>;
};

type LocalizedStyleRow = {
  name: string;
  name_es: string | null;
  name_ja: string | null;
  slug: string;
  slug_es: string | null;
  slug_ja: string | null;
  description: string | null;
  description_ja: string | null;
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
    .select("name, name_es, name_ja, slug, slug_es, slug_ja, description, description_ja")
    .order("name", { ascending: true });

  const stylesByName = new Map(
    ((localizedStyles as LocalizedStyleRow[] | null) ?? [])
      .map((s) => [s.name.toLowerCase(), s])
  );

  const byLower = new Map(agg.map((a) => [a.display.toLowerCase(), a]));

  if (!stylesByName.size) {
    return <p className="text-sm text-[#6b6b6b]">スタイル一覧を読み込めませんでした。</p>;
  }

  const hubItems: BrowseHubItem[] = Array.from(stylesByName.values()).map((s) => {
    const a = byLower.get(s.name.toLowerCase());
    const displayName = s.name_ja?.trim() || s.name;
    const linkSlug = s.slug;
    return {
      name: displayName,
      href: `/ja/styles/${linkSlug}`,
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
        <h1 className="mb-2 text-2xl font-semibold">{t.styles}</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">スタイル別に作品を探す</p>
      </div>

      {paginated.length ? <BrowseHubGrid items={paginated} /> : <p className="text-sm text-[#6b6b6b]">{t.noResults}</p>}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/ja/styles" />
    </div>
  );
}
