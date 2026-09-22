import Link from "next/link";
import { notFound } from "next/navigation";

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

export default async function CollectionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ loc?: string }>;
}) {
  const { id } = await params;
  const { loc } = await searchParams;
  const locale = resolveLocale(loc);
  const t = getLibraryT(locale);
  const { supabase, user } = await requireUser(`/account/collections/${id}`);

  // RLS already scopes this to the owner; the explicit user_id keeps it obvious.
  const { data: collection } = await supabase
    .from("collections")
    .select("id, name")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!collection) notFound();

  const { data: itemRows } = await supabase
    .from("collection_items")
    .select(`created_at, artworks (${ACCOUNT_ARTWORK_COLUMNS})`)
    .eq("collection_id", id)
    .order("created_at", { ascending: false });

  const artworks = (itemRows ?? [])
    .map((r) => r.artworks as unknown as AccountArtwork | null)
    .filter((a): a is AccountArtwork => Boolean(a));

  return (
    <div>
      <div className="mb-6">
        <Link
          href={accountHref("/account/collections", locale)}
          className="text-sm text-[#6b6b6b] underline-offset-2 hover:underline"
        >
          ← {t.accountCollections}
        </Link>
        <h2 className="mt-2 text-xl font-semibold text-[#1a1a1a]">{collection.name as string}</h2>
        <p className="mt-1 text-sm text-[#9a9a9a]">{t.itemCount(artworks.length)}</p>
      </div>

      {artworks.length === 0 ? (
        <EmptyState message={t.noFavourites} ctaLabel={t.browseArtworks} ctaHref="/artworks" />
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
          {artworks.map((a) => (
            <AccountArtworkCard key={a.id} artwork={a} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
