import { SearchResults, type SearchResultsConfig } from "@/components/SearchResults";
import { runSegmentedSearch } from "@/lib/site-search";

export const dynamic = "force-dynamic";

export const metadata = {
  title: { absolute: "Busca | Fine Art Free" },
  robots: {
    index: false,
    follow: true,
  },
};

const CONFIG: SearchResultsConfig = {
  locale: "pt",
  searchPath: "/pt/buscar",
  basePath: "/pt",
  artistPath: "/pt/artistas",
  labels: {
    searchTitle: "Busca",
    emptyPrompt: "Digite uma palavra-chave na barra de pesquisa para ver resultados.",
    errorText: "Erro ao carregar os resultados da pesquisa.",
    heading: (q) => `Resultados para "${q}"`,
    artworks: "Obras",
    artists: "Artistas",
    books: "Livros",
    prints: "Gravuras",
    noResults: "Nenhum resultado encontrado",
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
