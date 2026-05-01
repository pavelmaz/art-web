import { artworkImageUrl } from "@/lib/utils";

type ArtworkJsonLdInput = {
  title: string | null;
  artist_display: string | null;
  date_display: string | null;
  medium_display: string | null;
  dimensions: string | null;
  museum: string | null;
  url: string | null;
  image_id: string | null;
  description: string | null;
  slug: string | null;
};

type ArtworkJsonLdProps = {
  artwork: ArtworkJsonLdInput;
};

function nonEmpty(value: string | null | undefined): value is string {
  return Boolean(value?.trim());
}

export function ArtworkJsonLd({ artwork }: ArtworkJsonLdProps) {
  const image = artworkImageUrl(artwork);
  const title = artwork.title?.trim();
  const artist = artwork.artist_display?.trim();
  const dateCreated = artwork.date_display?.trim();
  const artMedium = artwork.medium_display?.trim();
  const size = artwork.dimensions?.trim();
  const museumName = artwork.museum?.trim();
  const description = artwork.description?.trim();

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    license: "https://creativecommons.org/publicdomain/zero/1.0/",
  };

  if (nonEmpty(title)) {
    schema.name = title;
  }
  if (nonEmpty(artist)) {
    schema.creator = {
      "@type": "Person",
      name: artist,
    };
  }
  if (nonEmpty(dateCreated)) {
    schema.dateCreated = dateCreated;
  }
  if (nonEmpty(artMedium)) {
    schema.artMedium = artMedium;
  }
  if (nonEmpty(image)) {
    schema.image = image;
  }
  if (nonEmpty(description)) {
    schema.description = description;
  }
  if (nonEmpty(museumName)) {
    schema.isPartOf = {
      "@type": "Museum",
      name: museumName,
    };
  }
  if (nonEmpty(size)) {
    schema.size = size;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
