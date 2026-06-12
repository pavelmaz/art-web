import { buildEnOnlyLanguageAlternates, buildHreflangLinkHeader } from "../lib/hreflang-paths";
import {
  buildArtworkLanguageAlternates,
  buildHubLanguageAlternates,
} from "../lib/locale-routes";

function headFromLanguages(canonical: string, languages: Record<string, string>): string {
  const lines: string[] = [`<link rel="canonical" href="${canonical}" />`];
  for (const [lang, href] of Object.entries(languages)) {
    lines.push(`<link rel="alternate" hreflang="${lang}" href="${href}" />`);
  }
  return lines.join("\n");
}

const cases: Array<{
  label: string;
  path: string;
  canonical?: string;
  languages?: Record<string, string>;
}> = [
  {
    label: "EN artwork detail (sample slug)",
    path: "/artworks/the-starry-night",
    canonical: "https://fineartfree.com/artworks/the-starry-night",
    languages: buildArtworkLanguageAlternates("the-starry-night"),
  },
  {
    label: "ES artwork detail (sample slug)",
    path: "/es/obras/the-starry-night",
    canonical: "https://fineartfree.com/es/obras/the-starry-night",
    languages: {
      ...buildArtworkLanguageAlternates("the-starry-night"),
      "x-default": "https://fineartfree.com/artworks/the-starry-night",
    },
  },
  {
    label: "JA artwork detail (sample slug)",
    path: "/ja/artworks/the-starry-night",
    canonical: "https://fineartfree.com/ja/artworks/the-starry-night",
    languages: {
      ...buildArtworkLanguageAlternates("the-starry-night"),
      "x-default": "https://fineartfree.com/artworks/the-starry-night",
    },
  },
  {
    label: "EN artists hub",
    path: "/artists",
    canonical: "https://fineartfree.com/artists",
    languages: buildHubLanguageAlternates("artists"),
  },
  {
    label: "JA artists hub",
    path: "/ja/artists",
    canonical: "https://fineartfree.com/ja/artists",
    languages: buildHubLanguageAlternates("artists"),
  },
  {
    label: "Blog post",
    path: "/blog/edvard-munch-paintings",
    canonical: "https://fineartfree.com/blog/edvard-munch-paintings",
    languages: buildEnOnlyLanguageAlternates("/blog/edvard-munch-paintings"),
  },
];

for (const c of cases) {
  console.log("=".repeat(60));
  console.log(c.label);
  console.log(`Path: ${c.path}`);
  console.log("\n--- Link header (middleware) ---");
  console.log(buildHreflangLinkHeader(c.path));
  if (c.canonical && c.languages) {
    console.log("\n--- <head> (metadata alternates) ---");
    console.log(headFromLanguages(c.canonical, c.languages));
  }
  console.log("");
}
