import type { MetadataRoute } from "next";

import { LOCALE_ROUTE_CONFIG } from "@/lib/locale-routes";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const wrongLocalePaths: string[] = [
    "/pt/artworks/",
    "/es/artworks/",
    "/pt/artists/",
    "/es/artists/",
  ];

  for (const config of Object.values(LOCALE_ROUTE_CONFIG)) {
    wrongLocalePaths.push(
      `${config.prefix}/artworks/`,
      `${config.prefix}/artists/`,
      `${config.prefix}/museums/`,
      `${config.prefix}/genres/`,
      `${config.prefix}/styles/`,
      `${config.prefix}/search/`
    );
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app/", "/_next/static/", ...wrongLocalePaths],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
};
