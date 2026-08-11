import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/utils";

/**
 * The three curated-set hubs, mirroring Artvee's shelving (which the catalog
 * deliberately replicates): true printmaking series under /prints, educational
 * charts under /wall-charts, plates from illustrated books and portfolios under
 * /book-illustrations. `object_type` on the artworks row decides the hub.
 */
export const COLLECTION_HUBS = {
  print: {
    objectType: "print",
    basePath: "/prints",
    navLabel: "Prints",
    heading: "Print collections",
    metaTitle: "Print Collections — Free High-Resolution Downloads | Fine Art Free",
    metaDescription:
      "Browse public domain print collections — complete published series of etchings, engravings and woodblock prints, free to download in high resolution.",
    intro:
      "Complete published series of etchings, engravings and woodblock prints — scanned at full plate size and free to download.",
  },
  "wall-chart": {
    objectType: "wall-chart",
    basePath: "/wall-charts",
    navLabel: "Wall Charts",
    heading: "Wall charts",
    metaTitle: "Vintage Wall Charts — Free High-Resolution Downloads | Fine Art Free",
    metaDescription:
      "Browse vintage educational wall charts — astronomy, anatomy, natural history, maps and school posters from the 19th and early 20th century, free to download in high resolution.",
    intro:
      "Educational charts that once hung in classrooms — astronomy, anatomy, natural history and pictorial maps, scanned at full size and free to download.",
  },
  "book-illustration": {
    objectType: "book-illustration",
    basePath: "/book-illustrations",
    navLabel: "Book Illustrations",
    metaTitle: "Book Illustrations — Free High-Resolution Downloads | Fine Art Free",
    heading: "Book illustrations",
    metaDescription:
      "Browse plates from classic illustrated books and print portfolios — Goya, Toulouse-Lautrec, Delacroix and more, free to download in high resolution.",
    intro:
      "Complete plate series from illustrated books and artist portfolios, scanned at full size and free to download.",
  },
} as const;

export type CollectionHubKey = keyof typeof COLLECTION_HUBS;
export const HUB_OBJECT_TYPES = Object.keys(COLLECTION_HUBS) as CollectionHubKey[];

export type PrintCollection = {
  name: string;
  count: number;
  objectType: CollectionHubKey;
  basePath: string;
  /** Dominant artist for real published sets; null for the catch-all bucket,
   *  where naming the most frequent hand would be a lie. */
  artist: string | null;
  cover: { image_id: string | null; url: string | null };
};

export const INDIVIDUAL_PRINTS = "Individual prints";

type Row = {
  collection: string | null;
  object_type: string | null;
  image_id: string | null;
  url: string | null;
  artist_display: string | null;
};

async function fetchRows(): Promise<Row[]> {
  const { data, error } = await supabase
    .from("artworks")
    .select("collection, object_type, image_id, url, artist_display")
    .in("object_type", HUB_OBJECT_TYPES)
    .order("score", { ascending: false })
    .range(0, 4999);
  if (error) {
    console.error("[print-collections]", error);
    return [];
  }
  return (data as Row[] | null) ?? [];
}

/**
 * All curated-set collections across the three hubs, grouped in memory from one
 * query — shared by the hub pages and the homepage strip so they can never
 * disagree. Rows arrive score-desc, so the first row seen per collection is its
 * best cover.
 */
export async function getPrintCollections(): Promise<PrintCollection[]> {
  const rows = await fetchRows();
  const groups = new Map<string, { count: number; cover: Row; artists: Map<string, number>; type: CollectionHubKey }>();
  for (const row of rows) {
    const type = (row.object_type ?? "print") as CollectionHubKey;
    const key = `${type}::${row.collection?.trim() || INDIVIDUAL_PRINTS}`;
    let g = groups.get(key);
    if (!g) {
      g = { count: 0, cover: row, artists: new Map(), type };
      groups.set(key, g);
    }
    g.count += 1;
    const a = row.artist_display?.trim();
    if (a) g.artists.set(a, (g.artists.get(a) ?? 0) + 1);
  }

  return [...groups.entries()]
    .map(([key, g]) => {
      const name = key.split("::")[1];
      return {
        name,
        count: g.count,
        objectType: g.type,
        basePath: COLLECTION_HUBS[g.type].basePath,
        cover: { image_id: g.cover.image_id, url: g.cover.url },
        artist:
          name === INDIVIDUAL_PRINTS
            ? null
            : [...g.artists.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
      };
    })
    // Real sets first, biggest first; the catch-all bucket always last.
    .sort((a, b) =>
      a.name === INDIVIDUAL_PRINTS ? 1 : b.name === INDIVIDUAL_PRINTS ? -1 : b.count - a.count
    );
}

/**
 * Works inside one collection of one hub. `collection` is stored as the
 * museum's own series title, so the slug is matched by slugifying candidates
 * rather than a reverse lookup — same approach as /genres/[slug].
 */
export async function loadCollectionWorks(objectType: CollectionHubKey, slugParam: string) {
  const { data } = await supabase
    .from("artworks")
    .select(
      "id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score, alt_text, collection"
    )
    .eq("object_type", objectType)
    .order("score", { ascending: false })
    .range(0, 4999);

  type WorkRow = {
    id: string; title: string | null; slug: string | null; artist_display: string | null;
    image_id: string | null; url: string | null; museum: string | null; style_title: string | null;
    genre_title: string | null; score: number | null; alt_text: string | null; collection: string | null;
  };
  const rows = (data as WorkRow[] | null) ?? [];
  const isCatchAll = objectType === "print" && slugParam === slugify(INDIVIDUAL_PRINTS);
  const matched = rows.filter((r) =>
    isCatchAll ? !r.collection?.trim() : slugify(r.collection ?? "") === slugParam
  );
  const name = isCatchAll ? INDIVIDUAL_PRINTS : matched[0]?.collection?.trim() ?? null;
  return { matched, name };
}

/** Which hub (if any) a collection slug lives under — powers cross-hub 301s
 *  after a collection is reclassified, so old URLs never dead-end. */
export async function findCollectionHub(slugParam: string): Promise<CollectionHubKey | null> {
  const all = await getPrintCollections();
  const hit = all.find((c) => slugify(c.name) === slugParam);
  return hit?.objectType ?? null;
}
