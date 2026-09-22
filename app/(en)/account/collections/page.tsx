import Link from "next/link";

import { AccountArtworkCard } from "@/components/account/AccountArtworkCard";
import { EmptyState } from "@/components/account/EmptyState";
import {
  ACCOUNT_ARTWORK_COLUMNS,
  accountHref,
  requireUser,
  resolveLocale,
  type AccountArtwork,
} from "@/lib/account";
import { getLibraryT } from "@/lib/library-translations";

export const dynamic = "force-dynamic";

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ loc?: string }>;
}) {
  const { loc } = await searchParams;
  const locale = resolveLocale(loc);
  const t = getLibraryT(locale);
  const { supabase, user } = await requireUser("/account/collections");

  const [{ data: collections }, { data: favRows }] = await Promise.all([
    supabase
      .from("collections")
      .select("id, name, collection_items(count)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("favorites")
      .select(`created_at, artworks (${ACCOUNT_ARTWORK_COLUMNS})`)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const favourites = (favRows ?? [])
    .map((r) => r.artworks as unknown as AccountArtwork | null)
    .filter((a): a is AccountArtwork => Boolean(a));

  return (
    <div className="space-y-12">
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[#1a1a1a]">{t.yourCollections}</h2>
        {!collections?.length ? (
          <EmptyState message={t.noCollections} ctaLabel={t.browseArtworks} ctaHref="/artworks" />
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {collections.map((c) => {
              const count =
                (c.collection_items as unknown as { count: number }[] | null)?.[0]?.count ?? 0;
              return (
                <li key={c.id as string}>
                  <Link
                    href={accountHref(`/account/collections/${c.id}`, locale)}
                    className="block rounded-xl border border-[#e8e6e1] bg-white p-4 transition hover:border-[#d8d5cf]"
                  >
                    <p className="truncate text-sm font-medium text-[#1a1a1a]">{c.name as string}</p>
                    <p className="mt-1 text-xs text-[#9a9a9a]">{t.itemCount(count)}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-[#1a1a1a]">{t.favourites}</h2>
        {favourites.length === 0 ? (
          <EmptyState message={t.noFavourites} ctaLabel={t.browseArtworks} ctaHref="/artworks" />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
            {favourites.map((a) => (
              <AccountArtworkCard key={a.id} artwork={a} locale={locale} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
