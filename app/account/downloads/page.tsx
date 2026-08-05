import Link from "next/link";

import { EmptyState } from "@/components/account/EmptyState";
import {
  ACCOUNT_ARTWORK_COLUMNS,
  artworkHref,
  requireUser,
  resolveLocale,
  type AccountArtwork,
} from "@/lib/account";
import { getLibraryT } from "@/lib/library-translations";
import { artworkGridImageUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DownloadsPage({
  searchParams,
}: {
  searchParams: Promise<{ loc?: string }>;
}) {
  const { loc } = await searchParams;
  const locale = resolveLocale(loc);
  const t = getLibraryT(locale);
  const { supabase, user } = await requireUser("/account/downloads");

  const { data: rows } = await supabase
    .from("downloads")
    .select(`id, size, created_at, artworks (${ACCOUNT_ARTWORK_COLUMNS})`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const downloads = (rows ?? []).filter((r) => r.artworks);

  if (downloads.length === 0) {
    return <EmptyState message={t.noDownloads} ctaLabel={t.browseArtworks} ctaHref="/artworks" />;
  }

  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <ul className="divide-y divide-[#e8e6e1] border-y border-[#e8e6e1]">
      {downloads.map((row) => {
        const art = row.artworks as unknown as AccountArtwork;
        const src = artworkGridImageUrl({ url: art.url, image_id: art.image_id });
        return (
          <li key={row.id as number}>
            <Link
              href={artworkHref(art.slug, locale)}
              className="flex items-center gap-4 py-3 transition hover:bg-[#faf9f7]"
            >
              <span className="size-14 shrink-0 overflow-hidden rounded bg-[#f1efea]">
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" loading="lazy" className="size-full object-cover" />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-[#1a1a1a]">
                  {art.title}
                </span>
                <span className="block truncate text-xs text-[#6b6b6b]">{art.artist_display}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-xs font-medium text-[#1a1a1a]">
                  {row.size === "max" ? t.sizeMax : t.sizeStandard}
                </span>
                <span className="block text-xs text-[#9a9a9a]">
                  {dateFmt.format(new Date(row.created_at as string))}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
