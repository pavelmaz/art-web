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
    <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {artworks.map((artwork) => (
        <ArtworkCard key={artwork.id} artwork={artwork} />
      ))}
    </section>
  );
}
