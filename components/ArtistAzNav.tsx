import Link from "next/link";

import {
  ARTIST_INDEX_LETTERS,
  artistLetterLabel,
  type ArtistIndexLetter,
} from "@/lib/artist-index";

type ArtistAzNavProps = {
  /** Base path for letter pages, e.g. "/artists/letter" or "/es/artistas/letter". */
  basePath: string;
  /** The currently-active letter, highlighted and non-linked. */
  current?: ArtistIndexLetter;
};

/** A–Z (+ "#") navigation linking to the per-letter artist index pages. */
export function ArtistAzNav({ basePath, current }: ArtistAzNavProps) {
  return (
    <nav aria-label="Browse artists A to Z" className="flex flex-wrap gap-1.5">
      {ARTIST_INDEX_LETTERS.map((letter) => {
        const label = artistLetterLabel(letter);
        if (letter === current) {
          return (
            <span
              key={letter}
              aria-current="page"
              className="rounded-md bg-[#1a1a1a] px-2.5 py-1.5 text-sm font-medium text-white"
            >
              {label}
            </span>
          );
        }
        return (
          <Link
            key={letter}
            href={`${basePath}/${letter}`}
            className="rounded-md bg-[#f0ede8] px-2.5 py-1.5 text-sm text-[#4a4a4a] transition-colors hover:bg-[#e0ddd8]"
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
