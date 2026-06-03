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
  alt_text?: string | null;
  genre_title?: string | null;
  style_title?: string | null;
};

type ArtworkJsonLdProps = {
  artwork: ArtworkJsonLdInput;
  /** Canonical artwork page URL for this locale */
  pageUrl?: string;
  /** BCP 47 language tag, e.g. fr, de, zh */
  inLanguage?: string;
};

function nonEmpty(value: string | null | undefined): value is string {
  return Boolean(value?.trim());
}

export function ArtworkJsonLd({ artwork, pageUrl, inLanguage }: ArtworkJsonLdProps) {
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
  schema.copyrightNotice = "Public Domain";

  if (nonEmpty(title)) {
    schema.name = title;
  }
  const detailUrl =
    pageUrl ??
    (nonEmpty(artwork.slug) ? `https://fineartfree.com/artworks/${artwork.slug}` : undefined);

  if (detailUrl) {
    schema.url = detailUrl;
    schema.acquireLicensePage = detailUrl;
  }
  if (nonEmpty(inLanguage)) {
    schema.inLanguage = inLanguage;
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
    schema.image = {
      "@type": "ImageObject",
      "url": image,
      "contentUrl": image,
      "name": `${title} by ${artist}`,
      "description": artwork.alt_text || `${title} by ${artist}`,
      "license": "https://creativecommons.org/publicdomain/zero/1.0/",
      "acquireLicensePage": detailUrl ?? `https://fineartfree.com/artworks/${artwork.slug}`,
      "creditText": artist || "Unknown artist",
    };
  }
  if (nonEmpty(description)) {
    schema.description = description;
  }
  if (nonEmpty(museumName)) {
    schema.isPartOf = {
      "@type": "Museum",
      name: museumName,
    };
    schema.creditText = museumName;
  }
  if (nonEmpty(size)) {
    schema.size = size;
  }

  if (nonEmpty(artwork.genre_title)) {
    schema.artform = artwork.genre_title;
  }

  if (nonEmpty(artwork.style_title)) {
    schema.artworkSurface = artwork.style_title;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
