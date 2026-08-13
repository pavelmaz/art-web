import { SearchResults, type SearchResultsConfig } from "@/components/SearchResults";
import { runSegmentedSearch } from "@/lib/site-search";

export const dynamic = "force-dynamic";

export const metadata = {
  title: { absolute: "Búsqueda | Fine Art Free" },
  robots: {
    index: false,
    follow: true,
  },
};

const CONFIG: SearchResultsConfig = {
  locale: "es",
  searchPath: "/es/buscar",
  basePath: "/es",
  artistPath: "/es/artistas",
  labels: {
    searchTitle: "Búsqueda",
    emptyPrompt: "Escribe una palabra clave en la barra de búsqueda para ver resultados.",
    errorText: "Error al cargar los resultados de búsqueda.",
    heading: (q) => `Resultados de "${q}"`,
    artworks: "Obras",
    artists: "Artistas",
    books: "Libros",
    prints: "Grabados",
    noResults: "No se encontraron resultados",
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
