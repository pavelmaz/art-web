import type { NextConfig } from "next";

import {
  LOCALE_ROUTE_CONFIG,
  buildLegacyLocalePathRedirects,
} from "./lib/locale-routes";

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
      if (enSeg === locSeg) {
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

// Artists merged after a spelling fork (the A-Z drip imported the same painter
// under two name variants → two artist pages). Reassign the works in the DB, then
// list the pair here so the retired slug 301s to the canonical one in every locale.
const ARTIST_MERGE_REDIRECTS: { from: string; to: string }[] = [
  // 23 Aug 2026 — full baptismal name folded into the common name (88 works + page).
  { from: "adolphe-joseph-thomas-monticelli", to: "adolphe-monticelli" },
];

function buildArtistMergeRedirects() {
  const redirects: { source: string; destination: string; permanent: boolean }[] = [];
  for (const { from, to } of ARTIST_MERGE_REDIRECTS) {
    // Base (English) path
    redirects.push({ source: `/artists/${from}`, destination: `/artists/${to}`, permanent: true });
    // Every non-English locale, using that locale's artists segment (es/pt → "artistas")
    for (const config of Object.values(LOCALE_ROUTE_CONFIG)) {
      const seg = config.segments.artists;
      redirects.push({
        source: `${config.prefix}/${seg}/${from}`,
        destination: `${config.prefix}/${seg}/${to}`,
        permanent: true,
      });
    }
  }
  return redirects;
}

function buildTopicsCountriesRedirects() {
  const locales = ["/fr", "/de", "/it", "/ko", "/ru", "/zh"] as const;
  const redirects: { source: string; destination: string; permanent: boolean }[] = [];

  for (const prefix of locales) {
    redirects.push(
      { source: `${prefix}/topics`, destination: prefix, permanent: true },
      { source: `${prefix}/countries`, destination: prefix, permanent: true },
      { source: `${prefix}/topics/:path*`, destination: prefix, permanent: true },
      { source: `${prefix}/countries/:path*`, destination: prefix, permanent: true }
    );
  }

  return redirects;
}

const nextConfig: NextConfig = {
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
      ...buildLegacyLocalePathRedirects(),
      ...buildTopicsCountriesRedirects(),
      ...buildArtistMergeRedirects(),
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
