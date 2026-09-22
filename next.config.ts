import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
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
      // Exact hub first, then sub-paths with `:path+` (one or more segments).
      // A leading `:path*` rule matched the bare hub with an EMPTY param: Next
      // substituted "" (→ `/es/obras/`, then a second hop to strip the slash),
      // while the Cloudflare adapter left the literal `:path*` in the Location.
      redirects.push({
        source: `${prefix}/${enSeg}`,
        destination: `${prefix}/${locSeg}`,
        permanent: true,
      });
      redirects.push({
        source: `${prefix}/${enSeg}/:path+`,
        destination: `${prefix}/${locSeg}/:path+`,
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
  // 29 Aug 2026 — patronymic form folded into the common name (7 works + page).
  { from: "rembrandt-harmensz-van-rijn", to: "rembrandt-van-rijn" },
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
  // Re-use prefetched dynamic-page payloads for 30 s in the browser (Next's
  // default is 0 s). Without it a tab whose links re-render keeps re-fetching the
  // same `?_rsc=` payloads every second — one visitor was ~200 requests/min.
  experimental: {
    staleTimes: { dynamic: 30 },
    // One root layout per locale (see components/SiteShell) means no single
    // layout can host the 404 for unmatched URLs; app/global-not-found.tsx does.
    globalNotFound: true,
  },
  // Workers can't load sharp (native module); the only caller falls back to the
  // Cloudflare Images binding there, so swap in a stub for that build only.
  ...(process.env.OPEN_NEXT_CLOUDFLARE_BUILD
    ? { turbopack: { resolveAlias: { sharp: "./lib/sharp-stub.ts" } } }
    : {}),
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

// Exposes Cloudflare bindings (R2, DOs) to `next dev`; no-op in production builds.
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

export default nextConfig;
