import Link from "@/components/Link";

import { artistDetailPath, type SiteLocale } from "@/lib/locale-routes";
import { getPrintCollections, INDIVIDUAL_PRINTS } from "@/lib/print-collections";
import { HUB_COPY, hubBasePath } from "@/lib/print-collections-i18n";
import { artworkGridImageUrl, slugify } from "@/lib/utils";
import { getVintagePosterArtists } from "@/lib/vintage-posters";

/**
 * The homepage "Books & Wall Charts" strip, shared by all ten locale homepages so
 * they can't drift apart: the advertising-poster artists first (newest additions,
 * Oct 2026), then the top print / book-illustration collections. The catch-all
 * "Individual prints" bucket stays out — it's browsing chrome, not a collection.
 */
export async function HomePrintsStrip({ locale }: { locale: SiteLocale }) {
  const copy = HUB_COPY[locale];
  const [allCollections, posterArtists] = await Promise.all([
    getPrintCollections(),
    getVintagePosterArtists(),
  ]);
  const collections = allCollections.filter((c) => c.name !== INDIVIDUAL_PRINTS).slice(0, 10);
  if (!collections.length && !posterArtists.length) return null;

  return (
    <section className="w-full bg-[#f6f4ee] py-8">
      <div className="px-5">
        <div className="mb-8 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold text-[#1a1a1a]">{copy.homeStrip}</h2>
          <Link
            href={hubBasePath("print", locale)}
            className="text-sm text-[#6b6b6b] underline underline-offset-2 hover:text-[#1a1a1a]"
          >
            {copy.viewAll}
          </Link>
        </div>
        <div className="flex gap-5 overflow-x-auto pb-2">
          {/* Poster cards keep the posters' portrait shape at the same height
              as the 16:10 collection cards, so the row stays level. */}
          {posterArtists.map((a) => {
            const src = a.cover ? artworkGridImageUrl(a.cover) : null;
            return (
              <Link key={a.slug} href={artistDetailPath(locale, a.slug)} className="group shrink-0">
                <div className="aspect-[3/4] h-40 overflow-hidden bg-[#e8e4de] md:h-[180px]">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : null}
                </div>
                <p className="w-[120px] pt-3 text-[15px] leading-snug text-[#1a1a1a] md:w-[135px]">{a.name}</p>
                <p className="mt-0.5 text-[13px] leading-snug text-[#8a8a8a]">{copy.worksCount(a.count)}</p>
              </Link>
            );
          })}
          {collections.map((c) => {
            const src = artworkGridImageUrl({ url: c.cover.url, image_id: c.cover.image_id });
            return (
              <Link
                key={c.name}
                href={`${hubBasePath(c.objectType, locale)}/${slugify(c.name)}`}
                className="group w-64 shrink-0 md:w-72"
              >
                <div className="aspect-[16/10] overflow-hidden bg-[#e8e4de]">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : null}
                </div>
                <p className="pt-3 text-[15px] leading-snug text-[#1a1a1a]">{c.name}</p>
                <p className="mt-0.5 text-[13px] leading-snug text-[#8a8a8a]">
                  {c.artist ?? copy.worksCount(c.count)}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
