import { SearchResults, type SearchResultsConfig } from "@/components/SearchResults";
import { runSegmentedSearch } from "@/lib/site-search";

export const dynamic = "force-dynamic";

export const metadata = {
  title: { absolute: "Recherche | Fine Art Free" },
  robots: {
    index: false,
    follow: true,
  },
};

const CONFIG: SearchResultsConfig = {
  locale: "fr",
  searchPath: "/fr/search",
  basePath: "/fr",
  artistPath: "/fr/artists",
  labels: {
    searchTitle: "Recherche",
    emptyPrompt: "Saisissez un mot-clé dans la barre de recherche pour voir les résultats.",
    errorText: "Erreur lors du chargement des résultats de recherche.",
    heading: (q) => `Résultats pour "${q}"`,
    artworks: "Œuvres",
    artists: "Artistes",
    books: "Livres",
    prints: "Estampes",
    noResults: "Aucun résultat",
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
