import { SearchResults, type SearchResultsConfig } from "@/components/SearchResults";
import { runSegmentedSearch } from "@/lib/site-search";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: {
    index: false,
    follow: true,
  },
};

const CONFIG: SearchResultsConfig = {
  locale: "en",
  searchPath: "/search",
  basePath: "",
  artistPath: "/artists",
  labels: {
    searchTitle: "Search",
    emptyPrompt: "Type a keyword in the search bar to see results.",
    errorText: "Error loading search results.",
    heading: (q) => `Results for "${q}"`,
    artworks: "Artworks",
    artists: "Artists",
    books: "Books",
    prints: "Prints",
    noResults: "No results found",
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
