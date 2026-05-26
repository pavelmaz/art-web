import { ArtistBio } from "@/components/ArtistBio";
import { formatArtistMetaLine } from "@/lib/format-artist-meta";
import { artworkImageUrl } from "@/lib/utils";

type ArtistProfileHeaderProps = {
  name: string;
  imageUrl: string | null;
  nationality: string | null;
  birthYear: number | null;
  deathYear: number | null;
  bio: string | null;
  readMoreLabel: string;
};

export function ArtistProfileHeader({
  name,
  imageUrl,
  nationality,
  birthYear,
  deathYear,
  bio,
  readMoreLabel,
}: ArtistProfileHeaderProps) {
  const metaLine = formatArtistMetaLine(nationality, birthYear, deathYear);
  const portraitSrc = imageUrl?.trim()
    ? artworkImageUrl({ url: null, image_id: imageUrl.trim() }, { width: 400, quality: 85 })
    : null;

  return (
    <header className="flex flex-col gap-8 sm:flex-row sm:items-start">
      {portraitSrc ? (
        <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-full sm:h-44 sm:w-44">
          <img src={portraitSrc} alt={name} className="h-full w-full object-cover" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1a1a1a] sm:text-4xl">{name}</h1>
        {metaLine ? <p className="mt-2 text-sm text-[#6b6b6b]">{metaLine}</p> : null}
        {bio ? (
          <div className="mt-4">
            <ArtistBio text={bio} readMoreLabel={readMoreLabel} />
          </div>
        ) : null}
      </div>
    </header>
  );
}
