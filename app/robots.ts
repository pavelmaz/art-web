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

  for (const locale of ["es", "pt"] as const) {
    const config = LOCALE_ROUTE_CONFIG[locale];
    wrongLocalePaths.push(
      `${config.prefix}/artworks/`,
      `${config.prefix}/artists/`,
      `${config.prefix}/museums/`,
      `${config.prefix}/genres/`,
      `${config.prefix}/styles/`,
      `${config.prefix}/search/`
    );
  }

  const localesWithoutTopicsCountries = ["/fr", "/de", "/it", "/ko", "/ru", "/zh"] as const;
  for (const prefix of localesWithoutTopicsCountries) {
    wrongLocalePaths.push(`${prefix}/topics`, `${prefix}/countries`);
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/app/", "/_next/static/", ...wrongLocalePaths],
      },
      {
        userAgent: "GPTBot",
        disallow: ["/"],
      },
      {
        userAgent: "ChatGPT-User",
        disallow: ["/"],
      },
      {
        userAgent: "CCBot",
        disallow: ["/"],
      },
      {
        userAgent: "anthropic-ai",
        disallow: ["/"],
      },
      {
        userAgent: "Claude-Web",
        disallow: ["/"],
      },
      {
        userAgent: "Omgilibot",
        disallow: ["/"],
      },
      {
        userAgent: "FacebookBot",
        disallow: ["/"],
      },
      {
        userAgent: "Diffbot",
        disallow: ["/"],
      },
      {
        userAgent: "Bytespider",
        disallow: ["/"],
      },
      {
        userAgent: "ImagesiftBot",
        disallow: ["/"],
      },
      {
        userAgent: "cohere-ai",
        disallow: ["/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
};
