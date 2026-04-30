import Link from "next/link";

import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/utils";

type ArtistRow = {
  artist_display: string | null;
};

export default async function ArtistsPage() {
  const primaryQuery = await supabase
    .from("artworks")
    .select("artist_display")
    .not("artist_display", "is", null)
    .neq("artist_display", "")
    .order("artist_display", { ascending: true });

  let rows = (primaryQuery.data as ArtistRow[] | null) ?? [];

  if (primaryQuery.error?.code === "57014") {
    const fallbackQuery = await supabase
      .from("artworks")
      .select("artist_display")
      .not("artist_display", "is", null)
      .limit(5000);

    if (fallbackQuery.error) {
      return <p>Error loading data</p>;
    }

    rows = (fallbackQuery.data as ArtistRow[] | null) ?? [];
  } else if (primaryQuery.error) {
    return <p>Error loading data</p>;
  }

  const uniqueArtists = Array.from(
    new Set(
      rows
        .map((item) => item.artist_display?.trim())
        .filter((artist): artist is string => Boolean(artist))
    )
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Artists</h1>
      <ul className="space-y-1">
        {uniqueArtists.map((artist) => (
          <li key={artist}>
            <Link href={`/artists/${slugify(artist)}`} className="underline">
              {artist}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
