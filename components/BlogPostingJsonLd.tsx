import { absoluteUrl } from "@/lib/utils";

type BlogPostingJsonLdProps = {
  headline: string;
  slug: string;
  datePublished: string;
  imageUrl?: string | null;
};

function sitePublisherName(): string {
  return process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "Fine Art Free";
}

export function BlogPostingJsonLd({
  headline,
  slug,
  datePublished,
  imageUrl,
}: BlogPostingJsonLdProps) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline,
    datePublished,
    url: absoluteUrl(`/blog/${slug}`),
    publisher: {
      "@type": "Organization",
      name: sitePublisherName(),
      url: absoluteUrl("/"),
    },
  };

  const image = imageUrl?.trim();
  if (image) {
    schema.image = image.startsWith("http") ? image : absoluteUrl(image);
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
