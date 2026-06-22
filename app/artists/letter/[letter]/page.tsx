import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArtistAzNav } from "@/components/ArtistAzNav";
import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import {
  artistLetterBucket,
  artistLetterLabel,
  getAllArtistsForIndex,
  isArtistIndexLetter,
} from "@/lib/artist-index";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";

export const revalidate = 86400;

const SITE = "https://fineartfree.com";

type LetterPageProps = {
  params: Promise<{ letter: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params, searchParams }: LetterPageProps): Promise<Metadata> {
  const { letter } = await params;
  if (!isArtistIndexLetter(letter)) {
    return { title: "Artists | Fine Art Free" };
  }
  const { page } = await searchParams;
  const pageNum = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const canonical =
    pageNum > 1
      ? `${SITE}/artists/letter/${letter}?page=${pageNum}`
      : `${SITE}/artists/letter/${letter}`;
  const label = letter === "other" ? "0–9 & other" : letter.toUpperCase();
  return {
    title: `Artists — ${label} | Fine Art Free`,
    description: `Browse public domain artists (${label}) with free high-resolution artworks to download.`,
    alternates: { canonical },
  };
}

export default async function ArtistsByLetterPage({ params, searchParams }: LetterPageProps) {
  const { letter } = await params;
  if (!isArtistIndexLetter(letter)) {
    notFound();
  }

  const resolved = await searchParams;
  const { page, from, to } = getPaginationParams(resolved);

  const all = await getAllArtistsForIndex();
  const matches = all.filter((a) => artistLetterBucket(a.display) === letter);

  if (matches.length === 0) {
    notFound();
  }

  const totalPages = Math.max(1, getTotalPages(matches.length));
  const pageItems = matches.slice(from, to + 1);
  const label = letter === "other" ? "0–9 & other" : letter.toUpperCase();

  return (
    <div className="space-y-6 px-5">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Artists — {label}</h1>
        <p className="mb-5 text-sm text-[#6b6b6b]">{matches.length} artists</p>
        <ArtistAzNav basePath="/artists/letter" current={letter} />
      </div>

      <BrowseHubGrid
        items={pageItems.map((a) => ({
          name: a.display,
          href: `/artists/${a.slug}`,
          count: a.count,
          imageId: a.imageId,
          url: null,
        }))}
      />

      <Pagination currentPage={page} totalPages={totalPages} basePath={`/artists/letter/${letter}`} />
    </div>
  );
}
