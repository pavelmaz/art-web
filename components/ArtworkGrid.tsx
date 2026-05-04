import { ArtworkCard } from "@/components/ArtworkCard";
import type { Artwork } from "@/types/artwork";

type ArtworkGridProps = {
  artworks: Artwork[];
};

export function ArtworkGrid({ artworks }: ArtworkGridProps) {
  if (!artworks.length) {
    return <p className="text-neutral-600">No artworks found.</p>;
  }

  return (
    <section className="columns-2 md:columns-3 lg:columns-4 [column-gap:16px]">
      {artworks.map((artwork) => (
        <div key={artwork.id} className="mb-4 break-inside-avoid">
          <ArtworkCard artwork={artwork} />
        </div>
      ))}
    </section>
  );
}
