import { SearchResults, type SearchResultsConfig } from "@/components/SearchResults";
import { runSegmentedSearch } from "@/lib/site-search";

export const dynamic = "force-dynamic";

export const metadata = {
  title: { absolute: "Suche | Fine Art Free" },
  robots: {
    index: false,
    follow: true,
  },
};

const CONFIG: SearchResultsConfig = {
  locale: "de",
  searchPath: "/de/search",
  basePath: "/de",
  artistPath: "/de/artists",
  labels: {
    searchTitle: "Suche",
    emptyPrompt: "Geben Sie einen Suchbegriff in die Suchleiste ein, um Ergebnisse zu sehen.",
    errorText: "Fehler beim Laden der Suchergebnisse.",
    heading: (q) => `Ergebnisse für "${q}"`,
    artworks: "Werke",
    artists: "Künstler",
    books: "Bücher",
    prints: "Drucke",
    noResults: "Keine Ergebnisse",
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
