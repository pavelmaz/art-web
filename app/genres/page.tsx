import Link from "next/link";

import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/utils";

type GenreRow = {
  genre_title: string | null;
};

export default async function GenresPage() {
  const primaryQuery = await supabase
    .from("artworks")
    .select("genre_title")
    .not("genre_title", "is", null)
    .neq("genre_title", "")
    .order("genre_title", { ascending: true });

  let rows = (primaryQuery.data as GenreRow[] | null) ?? [];

  if (primaryQuery.error?.code === "57014") {
    const fallbackQuery = await supabase
      .from("artworks")
      .select("genre_title")
      .not("genre_title", "is", null)
      .limit(5000);

    if (fallbackQuery.error) {
      return <p>Error loading data</p>;
    }

    rows = (fallbackQuery.data as GenreRow[] | null) ?? [];
  } else if (primaryQuery.error) {
    return <p>Error loading data</p>;
  }

  const genres = Array.from(
    new Set(
      rows
        .map((item) => item.genre_title?.trim())
        .filter((genre): genre is string => Boolean(genre))
    )
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Genres</h1>
      <ul className="space-y-1">
        {genres.map((genre) => (
          <li key={genre}>
            <Link href={`/genres/${slugify(genre)}`} className="underline">
              {genre}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
