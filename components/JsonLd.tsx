import { absoluteUrl } from "@/lib/utils";

export function WebSiteJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Fine Art Free",
    url: absoluteUrl("/"),
    description:
      "Browse and download 500,000+ public domain artworks free for personal and commercial use.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl("/search")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

type ArtistJsonLdProps = {
  name: string;
  slug: string;
  nationality?: string | null;
  birthYear?: number | null;
  deathYear?: number | null;
  description?: string | null;
  imageUrl?: string | null;
};

export function ArtistJsonLd({
  name,
  slug,
  nationality,
  birthYear,
  deathYear,
  description,
  imageUrl,
}: ArtistJsonLdProps) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ["Person", "Artist"],
    name,
    url: absoluteUrl(`/artists/${slug}`),
    jobTitle: "Artist",
  };

  const nation = nationality?.trim();
  if (nation) {
    schema.nationality = nation;
  }

  if (typeof birthYear === "number" && Number.isFinite(birthYear)) {
    schema.birthDate = String(birthYear);
  }

  if (typeof deathYear === "number" && Number.isFinite(deathYear)) {
    schema.deathDate = String(deathYear);
  }

  const desc = description?.trim();
  if (desc) {
    schema.description = desc.length > 300 ? `${desc.slice(0, 297)}...` : desc;
  }

  const image = imageUrl?.trim();
  if (image) {
    schema.image = image;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function CollectionPageJsonLd({
  name,
  path,
  description,
  numberOfItems,
}: {
  name: string;
  path: string;
  description?: string | null;
  numberOfItems?: number;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    url: absoluteUrl(path),
    description:
      description ||
      `Browse ${name} artworks free to download. Public domain art for personal and commercial use.`,
    ...(numberOfItems != null && { numberOfItems }),
    provider: {
      "@type": "Organization",
      name: "Fine Art Free",
      url: absoluteUrl("/"),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
