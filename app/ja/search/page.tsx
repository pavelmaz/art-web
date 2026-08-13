import type { Metadata } from "next";

import { SearchResults, type SearchResultsConfig } from "@/components/SearchResults";
import { runSegmentedSearch } from "@/lib/site-search";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "検索 | Fine Art Free" },
  description: "アーティスト名やキーワードから作品と作家を検索します。",
  alternates: {
    canonical: absoluteUrl("/ja/search"),
    languages: {
      en: absoluteUrl("/search"),
      es: absoluteUrl("/es/buscar"),
      pt: absoluteUrl("/pt/buscar"),
      ja: absoluteUrl("/ja/search"),
    },
  },
  robots: {
    index: false,
    follow: true,
  },
};

const CONFIG: SearchResultsConfig = {
  locale: "ja",
  searchPath: "/ja/search",
  basePath: "/ja",
  artistPath: "/ja/artists",
  labels: {
    searchTitle: "検索",
    emptyPrompt: "検索バーにキーワードを入力すると結果が表示されます。",
    errorText: "検索結果の読み込みに失敗しました。",
    heading: (q) => `「${q}」の検索結果`,
    artworks: "作品",
    artists: "アーティスト",
    books: "書籍",
    prints: "版画",
    noResults: "結果が見つかりません",
  },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string }>;
}) {
  const { q: rawQ, tab } = await searchParams;
  const q = rawQ?.trim() ?? "";
  const results = q ? await runSegmentedSearch(q) : null;
  return <SearchResults q={q} tab={tab} results={results} config={CONFIG} />;
}
