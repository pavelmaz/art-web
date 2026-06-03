import type { NextConfig } from "next";

import { LOCALE_ROUTE_CONFIG, buildLocaleSegmentRewrites } from "./lib/locale-routes";

function buildLocalePathRedirects() {
  const redirects: {
    source: string;
    destination: string;
    permanent: boolean;
  }[] = [];

  const englishSegments = ["artworks", "artists", "museums", "genres", "styles", "search"] as const;

  for (const config of Object.values(LOCALE_ROUTE_CONFIG)) {
    const prefix = config.prefix;
    const map: Record<(typeof englishSegments)[number], string> = {
      artworks: config.segments.artworks,
      artists: config.segments.artists,
      museums: config.segments.museums,
      genres: config.segments.genres,
      styles: config.segments.styles,
      search: config.segments.search,
    };

    for (const enSeg of englishSegments) {
      const locSeg = map[enSeg];
      if (enSeg === locSeg && enSeg !== "search") {
        continue;
      }
      if (enSeg === "search") {
        redirects.push({
          source: `${prefix}/search`,
          destination: `${prefix}/${locSeg}`,
          permanent: true,
        });
        continue;
      }
      redirects.push({
        source: `${prefix}/${enSeg}/:path*`,
        destination: `${prefix}/${locSeg}/:path*`,
        permanent: true,
      });
      redirects.push({
        source: `${prefix}/${enSeg}`,
        destination: `${prefix}/${locSeg}`,
        permanent: true,
      });
    }
  }

  return redirects;
}

const nextConfig: NextConfig = {
  async rewrites() {
    return buildLocaleSegmentRewrites();
  },
  async redirects() {
    return [
      {
        source: "/pt/artworks/:slug",
        destination: "/pt/obras/:slug",
        permanent: true,
      },
      {
        source: "/pt/artists/:slug",
        destination: "/pt/artistas/:slug",
        permanent: true,
      },
      {
        source: "/es/artworks/:slug",
        destination: "/es/obras/:slug",
        permanent: true,
      },
      {
        source: "/es/artists/:slug",
        destination: "/es/artistas/:slug",
        permanent: true,
      },
      ...buildLocalePathRedirects(),
      {
        source: "/genres/theatrical",
        destination: "/genres",
        permanent: true,
      },
      {
        source: "/genres/:slug(.*painting.*)",
        destination: "/genres",
        permanent: true,
      },
      {
        source: "/genres/:slug(.*oil.*)",
        destination: "/genres",
        permanent: true,
      },
      {
        source: "/genres/:slug(.*tempera.*)",
        destination: "/genres",
        permanent: true,
      },
      {
        source: "/genres/:slug(.*miniature.*)",
        destination: "/genres",
        permanent: true,
      },
      {
        source: "/genres/:slug(.*asian.*)",
        destination: "/genres",
        permanent: true,
      },
      {
        source: "/genres/:slug(.*scroll.*)",
        destination: "/genres",
        permanent: true,
      },
      {
        source: "/genres/:slug(.*embroidery.*)",
        destination: "/genres",
        permanent: true,
      },
      {
        source: "/genres/:slug(.*statuette.*)",
        destination: "/genres",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
