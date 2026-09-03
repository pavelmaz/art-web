import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import {
  findCollectionHub,
  loadCollectionWorks,
  type CollectionHubKey,
} from "@/lib/print-collections";
import { HUB_COPY, hubBasePath } from "@/lib/print-collections-i18n";
import type { SiteLocale } from "@/lib/locale-routes";
import { slugify } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

/**
 * Shared body for one collection under any hub. If the slug exists but under a
 * different hub (a collection was reclassified), 301 to its new home so
 * previously indexed URLs never dead-end. Localized per `locale`: chrome +
 * artwork titles; the collection name stays as stored.
 */
export async function CollectionDetailPage({
  hub,
  slugParam,
  locale = "en",
}: {
  hub: CollectionHubKey;
  slugParam: string;
  locale?: SiteLocale;
}) {
  const copy = HUB_COPY[locale];
  const heading = (hub === "print" ? copy.print : copy.book).heading;
  const basePath = hubBasePath(hub, locale);
  const { matched, name } = await loadCollectionWorks(hub, slugParam, locale);

  if (!name || matched.length === 0) {
    const actualHub = await findCollectionHub(slugParam);
    if (actualHub && actualHub !== hub) {
      permanentRedirect(`${hubBasePath(actualHub, locale)}/${slugParam}`);
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
          href={basePath}
          className="text-sm text-[#6b6b6b] underline-offset-2 hover:underline"
        >
          ← {heading}
        </Link>
        <h1 className="mb-2 mt-2 text-2xl font-semibold">{name}</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">
          {copy.worksCount(artworks.length)} · {copy.freeHiRes}
        </p>
      </div>

      <ArtworkGrid artworks={artworks} />
    </div>
  );
}
