import { SearchResults, type SearchResultsConfig } from "@/components/SearchResults";
import { runSegmentedSearch } from "@/lib/site-search";

export const dynamic = "force-dynamic";

export const metadata = {
  title: { absolute: "Ricerca | Fine Art Free" },
  robots: {
    index: false,
    follow: true,
  },
};

const CONFIG: SearchResultsConfig = {
  locale: "it",
  searchPath: "/it/search",
  basePath: "/it",
  artistPath: "/it/artists",
  labels: {
    searchTitle: "Ricerca",
    emptyPrompt: "Digita una parola chiave nella barra di ricerca per vedere i risultati.",
    errorText: "Errore nel caricamento dei risultati di ricerca.",
    heading: (q) => `Risultati per "${q}"`,
    artworks: "Opere",
    artists: "Artisti",
    books: "Libri",
    prints: "Stampe",
    noResults: "Nessun risultato",
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
