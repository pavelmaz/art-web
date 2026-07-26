import Image from "next/image";
import Link from "next/link";

import { artworkImageUrl } from "@/lib/utils";

export type BrowseHubItem = {
  name: string;
  href: string;
  count: number;
  imageId: string | null;
  url: string | null;
  /** White logo path (e.g. museums) — when set, the card centers the logo over a
   *  darkened version of the artwork instead of the plain name label. */
  logoSrc?: string | null;
  /** Force the dark, centered-label treatment even without a logo (e.g. museums
   *  we have no wordmark for) — centers the name in type over the darkened art. */
  dark?: boolean;
};

export function BrowseHubGrid({ items }: { items: BrowseHubItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
      {items.map((item) => {
        const imageUrl = artworkImageUrl({ url: item.url, image_id: item.imageId });

        return (
          <Link key={`${item.href}::${item.name}`} href={item.href}>
            <div className="group relative aspect-square cursor-pointer overflow-hidden">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={item.name}
                  fill={true}
                  unoptimized
                  className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#e8e4de]">
                  <span className="text-3xl font-semibold text-[#b8b0a6]" aria-hidden>
                    {item.name.trim().charAt(0).toUpperCase() || "?"}
                  </span>
                </div>
              )}

              {item.logoSrc || item.dark ? (
                <>
                  {/* darker layer so the logo/name reads over any artwork */}
                  <div className="pointer-events-none absolute inset-0 bg-[#0f1420]/72 transition-colors duration-300 group-hover:bg-[#0f1420]/62" />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-5 text-center">
                    {item.logoSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.logoSrc}
                        alt={item.name}
                        className="max-h-12 w-auto max-w-[80%] object-contain opacity-95"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-[12px] font-medium uppercase leading-relaxed tracking-[0.14em] text-white/90">
                        {item.name}
                      </span>
                    )}
                  </div>
                  <div className="pointer-events-none absolute bottom-0 left-0 p-3">
                    <p className="text-xs text-white/65">
                      {item.count} {item.count === 1 ? "artwork" : "artworks"}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.75)_0%,rgba(0,0,0,0.1)_60%)]" />
                  <div className="absolute bottom-0 left-0 p-3">
                    <p className="text-sm font-semibold text-white">{item.name}</p>
                    <p className="mt-0.5 text-xs text-white/70">
                      {item.count} {item.count === 1 ? "artwork" : "artworks"}
                    </p>
                  </div>
                </>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
