import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import {
  COLLECTION_HUBS,
  findCollectionHub,
  loadCollectionWorks,
  type CollectionHubKey,
} from "@/lib/print-collections";
import { slugify } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

/**
 * Shared body for one collection under any of the three hubs. If the slug
 * exists but under a different hub (a collection was reclassified), 301 to its
 * new home so previously indexed /prints/... URLs never dead-end.
 */
export async function CollectionDetailPage({
  hub,
  slugParam,
}: {
  hub: CollectionHubKey;
  slugParam: string;
}) {
  const cfg = COLLECTION_HUBS[hub];
  const { matched, name } = await loadCollectionWorks(hub, slugParam);

  if (!name || matched.length === 0) {
    const actualHub = await findCollectionHub(slugParam);
    if (actualHub && actualHub !== hub) {
      permanentRedirect(`${COLLECTION_HUBS[actualHub].basePath}/${slugParam}`);
    }
    notFound();
  }

  const artworks: Artwork[] = matched.map((item) => ({
    id: item.id,
    slug: item.slug ?? item.id,
    title: item.title ?? "",
    artistName: item.artist_display ?? "",
    artistDisplay: item.artist_display ?? undefined,
    imageUrl: item.image_id ?? "",
    imageId: item.image_id,
    museum: item.museum,
    styleTitle: item.style_title,
    genreTitle: item.genre_title,
    score: item.score,
    url: item.url,
    sourceUrl: item.url ?? undefined,
    altText: item.alt_text,
    styleSlug: item.style_title ? slugify(item.style_title) : "",
    styleName: item.style_title ?? "",
  }));

  return (
    <div className="space-y-8 px-5">
      <div>
        <Link
          href={cfg.basePath}
          className="text-sm text-[#6b6b6b] underline-offset-2 hover:underline"
        >
          ← {cfg.heading}
        </Link>
        <h1 className="mb-2 mt-2 text-2xl font-semibold">{name}</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">
          {artworks.length === 1 ? "1 work" : `${artworks.length} works`} · free to download in
          high resolution
        </p>
      </div>

      <ArtworkGrid artworks={artworks} />
    </div>
  );
}
