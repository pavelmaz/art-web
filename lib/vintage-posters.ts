import { supabase } from "@/lib/supabase";

/**
 * The advertising-poster designers shown as a shortcut row on the /prints hub
 * (all locales). Their posters live in the main catalogue (object_type null),
 * so the hub's collection grid can't reach them — this links to the artist
 * pages instead. Order = display order; `cover` = the artwork slug used as the
 * card image (each artist's best-known poster).
 */
export const VINTAGE_POSTER_ARTISTS: { slug: string; cover: string }[] = [
  { slug: "leonetto-cappiello", cover: "le-frou-frou-leonetto-cappiello" },
  { slug: "alphonse-mucha", cover: "job-alphonse-mucha" },
  { slug: "henri-de-toulouse-lautrec", cover: "divan-japonais-75-rue-des-martyrs-ed-henri-de-toulouse-lautrec" },
  { slug: "jules-cheret", cover: "saxoleine-petrole-de-surete-jules-cheret" },
  { slug: "theophile-alexandre-steinlen", cover: "tournee-du-chat-noir-theophile-alexandre-steinlen" },
  { slug: "roger-broders", cover: "marseille-point-de-depart-de-la-cote-d-azur-roger-broders" },
  { slug: "eugene-grasset", cover: "jeanne-d-arc-sarah-bernhardt-eugene-grasset" },
  { slug: "edward-penfield", cover: "harper-s-april-1897-edward-penfield" },
  { slug: "emil-cardinaux", cover: "zermatt-matterhorn-emil-cardinaux" },
  { slug: "henri-privat-livemont", cover: "absinthe-robette-henri-privat-livemont" },
  { slug: "manuel-orazi", cover: "loie-fuller-manuel-orazi" },
  { slug: "ethel-reed", cover: "arabella-and-araminta-stories-ethel-reed" },
  { slug: "ludwig-hohlwein", cover: "zoologischer-garten-munchen-ludwig-hohlwein" },
  { slug: "achille-mauzan", cover: "perfumes-griet-achille-mauzan" },
  { slug: "plinio-codognato", cover: "cicli-fiat-plinio-codognato" },
  { slug: "adolfo-hohenstein", cover: "la-boheme-de-g-puccini-adolfo-hohenstein" },
  { slug: "leopoldo-metlicovitz", cover: "madama-butterfly-leopoldo-metlicovitz" },
  { slug: "alfred-roller", cover: "opernredoute-1929-alfred-roller" },
  { slug: "julius-klinger", cover: "muller-extra-julius-klinger" },
  { slug: "john-hassall", cover: "skegness-is-so-bracing-john-hassall" },
];

export type VintagePosterArtist = {
  name: string;
  slug: string;
  count: number;
  cover: { url: string | null; image_id: string | null } | null;
};

/** Artists in registry order; missing artists are dropped, a missing cover
 *  leaves the card without an image rather than hiding the artist. */
export async function getVintagePosterArtists(): Promise<VintagePosterArtist[]> {
  const [{ data: artists, error: aErr }, { data: covers, error: cErr }] = await Promise.all([
    supabase
      .from("artists")
      .select("name, slug, artwork_count")
      .in("slug", VINTAGE_POSTER_ARTISTS.map((a) => a.slug)),
    supabase
      .from("artworks")
      .select("slug, url, image_id")
      .in("slug", VINTAGE_POSTER_ARTISTS.map((a) => a.cover)),
  ]);
  if (aErr || cErr) console.error("[vintage-posters]", aErr ?? cErr);

  const artistBySlug = new Map((artists ?? []).map((a) => [a.slug as string, a]));
  const coverBySlug = new Map((covers ?? []).map((c) => [c.slug as string, c]));
  return VINTAGE_POSTER_ARTISTS.flatMap(({ slug, cover }) => {
    const a = artistBySlug.get(slug);
    if (!a) return [];
    const c = coverBySlug.get(cover);
    return [{
      name: a.name as string,
      slug,
      count: (a.artwork_count as number | null) ?? 0,
      cover: c ? { url: (c.url as string | null) ?? null, image_id: (c.image_id as string | null) ?? null } : null,
    }];
  });
}
