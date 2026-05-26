import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Pagination } from "@/components/Pagination";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { supabase } from "@/lib/supabase";
import { absoluteUrl, artworkImageUrl } from "@/lib/utils";
import { getT } from "@/lib/translations";

export const revalidate = 86400;

const t = getT("ja");

export const metadata: Metadata = {
  title: "話題・タグから探す — パブリックドメイン無料 | Fine Art Free",
  description:
    "夕焼け、馬、花、森など、人気のタグから7万件以上のパブリックドメイン作品を無料で高解像度ダウンロード。",
  alternates: {
    canonical: absoluteUrl("/ja/topics"),
    languages: {
      en: absoluteUrl("/topics"),
      es: absoluteUrl("/es/temas"),
      pt: absoluteUrl("/pt/temas"),
      ja: absoluteUrl("/ja/topics"),
    },
  },
  openGraph: {
    title: "話題・タグから探す — パブリックドメイン無料 | Fine Art Free",
    description:
      "夕焼け、馬、花、森など、人気のタグから7万件以上のパブリックドメイン作品を無料で高解像度ダウンロード。",
  },
};

const EXCLUDED_TAGS = new Set([
  "nature", "light", "tranquility", "serenity", "reflection", "shadow",
  "texture", "color", "contrast", "harmony", "depth", "movement",
  "pattern", "atmosphere", "space", "form", "golden light", "emotion", "landscape",
]);

type TopicsPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function TopicsPage({ searchParams }: TopicsPageProps) {
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const { data } = await supabase.rpc("get_popular_tags", { min_count: 200 });

  type TagRow = { tag: string; count: number };

  const allTags: { tag: string; count: number; slug: string }[] = (data as TagRow[] ?? [])
    .filter((row) => !EXCLUDED_TAGS.has(row.tag.toLowerCase()))
    .map((row) => ({
      tag: row.tag,
      count: row.count,
      slug: row.tag.toLowerCase().replace(/\s+/g, "-"),
    }));

  const totalPages = Math.max(1, getTotalPages(allTags.length));
  const paginated = allTags.slice(from, to + 1);

  const paginatedWithImages = await Promise.all(
    paginated.map(async (item) => {
      const { data: artworkData } = await supabase
        .from("artworks")
        .select("image_id, url")
        .contains("tags", [item.tag])
        .limit(1);
      const row = artworkData?.[0];
      return {
        ...item,
        imageUrl: row ? artworkImageUrl({ url: row.url, image_id: row.image_id }) : null,
      };
    })
  );

  return (
    <div className="space-y-8 px-5">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">{t.topics}</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">タグ・テーマ別に作品を探す</p>
      </div>

      {paginatedWithImages.length ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          {paginatedWithImages.map((item) => (
            <Link key={item.slug} href={`/ja/topics/${item.slug}`}>
              <div className="group relative aspect-square cursor-pointer overflow-hidden">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.tag}
                    fill
                    unoptimized
                    className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full bg-[#f0ede8]" />
                )}
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.75)_0%,rgba(0,0,0,0.1)_60%)]" />
                <div className="absolute bottom-0 left-0 p-3">
                  <p className="text-sm font-semibold text-white capitalize">{item.tag}</p>
                  <p className="mt-0.5 text-xs text-white/70">
                    {item.count} {t.artworks}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#6b6b6b]">{t.noResults}</p>
      )}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/ja/topics" />
    </div>
  );
}
