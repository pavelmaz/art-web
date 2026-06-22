import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArtistAzNav } from "@/components/ArtistAzNav";
import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import {
  artistLetterBucket,
  getAllArtistsForIndex,
  isArtistIndexLetter,
} from "@/lib/artist-index";
import { fillArtistHubPreviewImages } from "@/lib/cached-hub-data";
import { localePath } from "@/lib/locale-routes";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { getT, type Locale } from "@/lib/translations";
import { slugify } from "@/lib/utils";

const SITE = "https://fineartfree.com";

export type ArtistLetterRouteProps = {
  params: Promise<{ letter: string }>;
  searchParams: Promise<{ page?: string }>;
};

function letterLabel(letter: string): string {
  return letter === "other" ? "0–9 & other" : letter.toUpperCase();
}

/** Localized metadata for an artist letter-index page (self-canonical per locale). */
export async function artistLetterMetadata(
  locale: Locale,
  { params, searchParams }: ArtistLetterRouteProps,
): Promise<Metadata> {
  const { letter } = await params;
  const t = getT(locale);
  if (!isArtistIndexLetter(letter)) {
    return { title: `${t.artists} | Fine Art Free` };
  }
  const { page } = await searchParams;
  const pageNum = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const path = `${localePath(locale, "artists")}/letter/${letter}`;
  const canonical = pageNum > 1 ? `${SITE}${path}?page=${pageNum}` : `${SITE}${path}`;
  const label = letterLabel(letter);
  return {
    title: `${t.artists} — ${label} | Fine Art Free`,
    description: `${t.artists} — ${label}. ${t.freeArtworks}`,
    alternates: { canonical },
  };
}

/** Shared A–Z artist letter-index page body, reused by every locale's thin route. */
export async function ArtistLetterIndex({
  locale,
  params,
  searchParams,
}: ArtistLetterRouteProps & { locale: Locale }) {
  const { letter } = await params;
  if (!isArtistIndexLetter(letter)) {
    notFound();
  }

  const resolved = await searchParams;
  const { page, from, to } = getPaginationParams(resolved);
  const t = getT(locale);
  const base = localePath(locale, "artists");

  const all = await getAllArtistsForIndex();
  const matches = all.filter((a) => artistLetterBucket(a.display) === letter);
  if (matches.length === 0) {
    notFound();
  }

  const totalPages = Math.max(1, getTotalPages(matches.length));
  const withPreviews = await fillArtistHubPreviewImages(
    matches.slice(from, to + 1).map((a) => ({
      display: a.display,
      count: a.count,
      slug: a.slug,
      image_id: a.imageId,
      url: null,
    })),
  );
  const label = letterLabel(letter);

  return (
    <div className="space-y-6 px-5">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">
          {t.artists} — {label}
        </h1>
        <p className="mb-5 text-sm text-[#6b6b6b]">
          {matches.length} {t.artists}
        </p>
        <ArtistAzNav basePath={`${base}/letter`} current={letter} />
      </div>

      <BrowseHubGrid
        items={withPreviews.map((a) => ({
          name: a.display,
          href: a.slug ? `${base}/${a.slug}` : `${base}/${slugify(a.display)}`,
          count: a.count,
          imageId: a.image_id,
          url: a.url,
        }))}
      />

      <Pagination currentPage={page} totalPages={totalPages} basePath={`${base}/letter/${letter}`} />
    </div>
  );
}
