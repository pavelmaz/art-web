import { ArtistBio } from "@/components/ArtistBio";
import { formatMuseumMetaLine } from "@/lib/format-museum-meta";

type MuseumProfileHeaderProps = {
  name: string;
  city: string | null;
  country: string | null;
  description: string | null;
  readMoreLabel: string;
};

export function MuseumProfileHeader({
  name,
  city,
  country,
  description,
  readMoreLabel,
}: MuseumProfileHeaderProps) {
  const metaLine = formatMuseumMetaLine(city, country);

  return (
    <header>
      <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1a1a1a] sm:text-4xl">{name}</h1>
      {metaLine ? <p className="mt-2 text-sm text-[#6b6b6b]">{metaLine}</p> : null}
      {description ? (
        <div className="mt-4 max-w-3xl">
          <ArtistBio text={description} readMoreLabel={readMoreLabel} />
        </div>
      ) : null}
    </header>
  );
}
