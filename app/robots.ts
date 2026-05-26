import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/app/",
        "/_next/static/",
        "/pt/artworks/",
        "/es/artworks/",
        "/pt/artists/",
        "/es/artists/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
