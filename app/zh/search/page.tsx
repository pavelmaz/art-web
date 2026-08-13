import { SearchResults, type SearchResultsConfig } from "@/components/SearchResults";
import { runSegmentedSearch } from "@/lib/site-search";

export const dynamic = "force-dynamic";

export const metadata = {
  title: { absolute: "搜索 | Fine Art Free" },
  robots: {
    index: false,
    follow: true,
  },
};

const CONFIG: SearchResultsConfig = {
  locale: "zh",
  searchPath: "/zh/search",
  basePath: "/zh",
  artistPath: "/zh/artists",
  labels: {
    searchTitle: "搜索",
    emptyPrompt: "在搜索栏中输入关键词即可查看结果。",
    errorText: "加载搜索结果时出错。",
    heading: (q) => `搜索结果 "${q}"`,
    artworks: "作品",
    artists: "艺术家",
    books: "书籍",
    prints: "版画",
    noResults: "未找到结果",
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
