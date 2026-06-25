import Image from "next/image";
import Link from "next/link";

import { artworkImageUrl } from "@/lib/utils";

export type BrowseHubItem = {
  name: string;
  href: string;
  count: number;
  imageId: string | null;
  url: string | null;
};

export function BrowseHubGrid({ items }: { items: BrowseHubItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
      {items.map((item) => {
        const imageUrl = artworkImageUrl({ url: item.url, image_id: item.imageId });

        return (
          <Link key={`${item.href}::${item.name}`} href={item.href}>
            <div className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl">
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

              <div className="glass-primary pointer-events-none absolute inset-x-2 bottom-2 rounded-lg px-3 py-2">
                <p className="text-sm font-semibold text-white">{item.name}</p>
                <p className="mt-0.5 text-xs text-white/75">
                  {item.count} {item.count === 1 ? "artwork" : "artworks"}
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
