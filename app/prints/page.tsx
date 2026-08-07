import type { Metadata } from "next";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
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
  title: "Print Collections — Free High-Resolution Downloads | Fine Art Free",
  description:
    "Browse public domain print collections — complete published series of etchings, engravings and woodblock prints, free to download in high resolution.",
  alternates: { canonical: absoluteUrl("/prints") },
};

type Row = {
  collection: string | null;
  image_id: string | null;
  url: string | null;
};

export default async function PrintsPage() {
  const { data, error } = await supabase
    .from("artworks")
    .select("collection, image_id, url")
    .eq("object_type", "print")
    .order("score", { ascending: false });

  if (error) {
    console.error("[PrintsPage]", error);
    return <p className="px-5">Error loading prints</p>;
  }

  const rows = (data as Row[] | null) ?? [];

  // Group in memory: the set is small and this avoids a second round trip per card.
  const groups = new Map<string, { count: number; cover: Row }>();
  for (const row of rows) {
    const key = row.collection?.trim() || "Individual prints";
    const existing = groups.get(key);
    if (existing) existing.count += 1;
    else groups.set(key, { count: 1, cover: row });
  }

  const collections = [...groups.entries()]
    .map(([name, g]) => ({ name, count: g.count, cover: g.cover }))
    // Real sets first, biggest first; the catch-all bucket always last.
    .sort((a, b) =>
      a.name === "Individual prints" ? 1 : b.name === "Individual prints" ? -1 : b.count - a.count
    );

  return (
    <div className="space-y-8 px-5">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Print collections</h1>
        <p className="mb-8 max-w-2xl text-sm text-[#6b6b6b]">
          Complete published series of etchings, engravings and woodblock prints — scanned
          at full plate size and free to download.
          {rows.length ? ` ${collections.length} collections, ${rows.length} works.` : ""}
        </p>
      </div>

      {collections.length === 0 ? (
        <p className="text-sm text-[#6b6b6b]">No collections yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
          {collections.map((c) => {
            const src = artworkGridImageUrl({
              url: c.cover.url,
              image_id: c.cover.image_id,
            });
            return (
              <li key={c.name}>
                <Link href={`/prints/${slugify(c.name)}`} className="group block">
                  {/* Fixed 4:5 box with object-cover. Letting each cover keep its
                      own aspect ratio staggers the grid badly — these are prints,
                      so they range from wide panoramas to tall plates. */}
                  <div className="aspect-[4/5] overflow-hidden rounded-lg bg-[#f1efea]">
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
                  <p className="line-clamp-2 pt-2.5 text-[13px] font-medium leading-snug text-[#1a1a1a]">
                    {c.name}
                  </p>
                  <p className="mt-[2px] text-[12px] text-[#6b6b6b]">
                    {c.count === 1 ? "1 work" : `${c.count} works`}
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
