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
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
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
                <div className="h-full w-full bg-[#f0ede8]" />
              )}

              <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.75)_0%,rgba(0,0,0,0.1)_60%)]" />

              <div className="absolute bottom-0 left-0 p-3">
                <p className="text-sm font-semibold text-white">{item.name}</p>
                <p className="mt-0.5 text-xs text-white/70">
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
