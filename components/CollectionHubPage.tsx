import Link from "next/link";

import { getPrintCollections, type CollectionHubKey } from "@/lib/print-collections";
import { HUB_COPY, hubBasePath } from "@/lib/print-collections-i18n";
import type { SiteLocale } from "@/lib/locale-routes";
import { artworkGridImageUrl, slugify } from "@/lib/utils";

/**
 * Shared body for the curated-set hubs (/prints, /book-illustrations) — one
 * Artvee-style card grid, filtered to the hub's object_type. Pages own their
 * metadata; this owns the rendering, so the hubs cannot drift apart visually.
 * Localized per `locale` (chrome + links); collection names stay as stored.
 */
export async function CollectionHubPage({
  hub,
  locale = "en",
}: {
  hub: CollectionHubKey;
  locale?: SiteLocale;
}) {
  const copy = HUB_COPY[locale];
  const text = hub === "print" ? copy.print : copy.book;
  const basePath = hubBasePath(hub, locale);
  const collections = (await getPrintCollections()).filter((c) => c.objectType === hub);
  const totalWorks = collections.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="space-y-8 px-5">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">{text.heading}</h1>
        <p className="mb-8 max-w-2xl text-sm text-[#6b6b6b]">
          {text.intro}
          {totalWorks ? copy.collectionsLine(collections.length, totalWorks) : ""}
        </p>
      </div>

      {collections.length === 0 ? (
        <p className="text-sm text-[#6b6b6b]">{copy.noCollections}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {collections.map((c) => {
            const src = artworkGridImageUrl({
              url: c.cover.url,
              image_id: c.cover.image_id,
            });
            return (
              <li key={c.name}>
                <Link href={`${basePath}/${slugify(c.name)}`} className="group block">
                  {/* Wide landscape crop, uniform across the grid — letting each
                      cover keep its own ratio staggers the rows badly. */}
                  <div className="aspect-[16/10] overflow-hidden bg-[#f1efea]">
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={src}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-[#aaa]">
                        No image
                      </div>
                    )}
                  </div>
                  <p className="pt-3 text-[15px] leading-snug text-[#1a1a1a]">{c.name}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-[#8a8a8a]">
                    {c.artist ?? copy.worksCount(c.count)}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
