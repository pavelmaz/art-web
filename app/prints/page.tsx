import type { Metadata } from "next";
import Link from "next/link";

import { getPrintCollections } from "@/lib/print-collections";
import { absoluteUrl, artworkGridImageUrl, slugify } from "@/lib/utils";

export const revalidate = 86400;

/**
 * Collections hub for `object_type = 'print'`, organised the way this material
 * actually exists: by the published set it came from (Dürer's Apocalypse,
 * The Temptation of Saint Anthony), not as one flat wall of images. Each card
 * opens the set.
 *
 * Prints without a series are grouped under "Individual prints" rather than
 * dropped — roughly three quarters of Cleveland's prints are one-off
 * acquisitions with no set to belong to.
 */
export const metadata: Metadata = {
  title: { absolute: "Print Collections — Free High-Resolution Downloads | Fine Art Free" },
  description:
    "Browse public domain print collections — complete published series of etchings, engravings and woodblock prints, free to download in high resolution.",
  alternates: { canonical: absoluteUrl("/prints") },
};

export default async function PrintsPage() {
  const collections = await getPrintCollections();
  const totalWorks = collections.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="space-y-8 px-5">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Print collections</h1>
        <p className="mb-8 max-w-2xl text-sm text-[#6b6b6b]">
          Complete published series of etchings, engravings and woodblock prints — scanned
          at full plate size and free to download.
          {totalWorks ? ` ${collections.length} collections, ${totalWorks} works.` : ""}
        </p>
      </div>

      {collections.length === 0 ? (
        <p className="text-sm text-[#6b6b6b]">No collections yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {collections.map((c) => {
            const src = artworkGridImageUrl({
              url: c.cover.url,
              image_id: c.cover.image_id,
            });
            return (
              <li key={c.name}>
                <Link href={`/prints/${slugify(c.name)}`} className="group block">
                  {/* Wide landscape crop, uniform across the grid. Letting each
                      cover keep its own ratio staggers the rows badly — prints
                      run from panoramas to tall plates — and a letterbox crop
                      reads as a collection rather than as a single work. */}
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
                    {c.artist ?? `${c.count} ${c.count === 1 ? "work" : "works"}`}
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
