import { SearchResults, type SearchResultsConfig } from "@/components/SearchResults";
import { runSegmentedSearch } from "@/lib/site-search";

export const dynamic = "force-dynamic";

export const metadata = {
  title: { absolute: "Поиск | Fine Art Free" },
  robots: {
    index: false,
    follow: true,
  },
};

const CONFIG: SearchResultsConfig = {
  locale: "ru",
  searchPath: "/ru/search",
  basePath: "/ru",
  artistPath: "/ru/artists",
  labels: {
    searchTitle: "Поиск",
    emptyPrompt: "Введите ключевое слово в строку поиска, чтобы увидеть результаты.",
    errorText: "Ошибка загрузки результатов поиска.",
    heading: (q) => `Результаты для «${q}»`,
    artworks: "Произведения",
    artists: "Художники",
    books: "Книги",
    prints: "Гравюры",
    noResults: "Результаты не найдены",
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
