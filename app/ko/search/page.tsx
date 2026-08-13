import { SearchResults, type SearchResultsConfig } from "@/components/SearchResults";
import { runSegmentedSearch } from "@/lib/site-search";

export const dynamic = "force-dynamic";

export const metadata = {
  title: { absolute: "검색 | Fine Art Free" },
  robots: {
    index: false,
    follow: true,
  },
};

const CONFIG: SearchResultsConfig = {
  locale: "ko",
  searchPath: "/ko/search",
  basePath: "/ko",
  artistPath: "/ko/artists",
  labels: {
    searchTitle: "검색",
    emptyPrompt: "검색창에 키워드를 입력하면 결과가 표시됩니다.",
    errorText: "검색 결과를 불러오는 중 오류가 발생했습니다.",
    heading: (q) => `"${q}" 검색 결과`,
    artworks: "작품",
    artists: "예술가",
    books: "도서",
    prints: "판화",
    noResults: "결과 없음",
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
