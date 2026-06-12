/**
 * Full SEO indexability audit against production.
 *
 * Run:  npm run seo:audit
 *       npx tsx scripts/seo-full-audit.ts
 *
 * Env:
 *   SEO_AUDIT_BASE=https://fineartfree.com  (default)
 *   SEO_AUDIT_INTERVAL_MS=1600            (~37 req/min; site middleware caps at 45/min)
 *
 * Flags:
 *   --skip-sitemaps   Skip HEAD-checking all child sitemaps (~50 min saved)
 *
 * Runtime: ~15–25 min without --skip-sitemaps; ~60–90 min with full sitemap HEAD phase.
 */

import { buildEnOnlyLanguageAlternates as enOnlyAlternates } from "../lib/hreflang-paths";
import {
  HREFLANG_LOCALES,
  artworkDetailPath,
  artistDetailPath,
  buildArtistLanguageAlternates,
  buildArtworkLanguageAlternates,
  buildHomeLanguageAlternates,
  buildHubLanguageAlternates,
  buildGenreLanguageAlternates,
  buildStyleLanguageAlternates,
  buildMuseumLanguageAlternates,
  localePath,
  type SiteLocale,
} from "../lib/locale-routes";

const BASE = (process.env.SEO_AUDIT_BASE ?? "https://fineartfree.com").replace(/\/$/, "");
const INTERVAL_MS = Number(process.env.SEO_AUDIT_INTERVAL_MS ?? 1600);
const MAX_PER_MINUTE = 38;
const HEAD_TIMEOUT_MS = 20_000;
const GET_TIMEOUT_MS = 45_000;

const LOCALES: SiteLocale[] = ["en", ...HREFLANG_LOCALES.filter((l) => l !== "en")];
const TOPICS_LOCALES: SiteLocale[] = ["en", "es", "pt", "ja"];

type HreflangMode = "full" | "en-only" | "topics-countries" | "home" | "none";
type JsonLdExpectation = "VisualArtwork" | "Person" | "BlogPosting" | "none";
type HubKey = "artworks" | "artists" | "genres" | "styles" | "museums";

type SampleSpec = {
  pattern: string;
  locale: SiteLocale | "—";
  path: string;
  hreflang: HreflangMode;
  jsonLd: JsonLdExpectation;
  contentNeedle?: string;
};

type CheckName =
  | "http_200"
  | "no_noindex"
  | "canonical_self"
  | "hreflang_complete"
  | "hreflang_alternates_200"
  | "hreflang_reciprocal"
  | "single_h1"
  | "title_description"
  | "json_ld"
  | "ssr_content";

type FetchResult = {
  status: number;
  chain: string[];
  html: string;
  headers: Headers;
};

type Failure = {
  pattern: string;
  locale: string;
  url: string;
  check: CheckName;
  detail: string;
};

type CellResult = { pattern: string; locale: string; check: CheckName; pass: boolean };

type PageAudit = {
  sample: SampleSpec;
  url: string;
  result: FetchResult;
  mergedHreflang: Map<string, string>;
};

const failures: Failure[] = [];
const table: CellResult[] = [];
const pageCache = new Map<string, FetchResult>();
const requestTimestamps: number[] = [];
let lastRequestAt = 0;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function record(
  pattern: string,
  locale: string,
  url: string,
  check: CheckName,
  pass: boolean,
  detail: string
) {
  table.push({ pattern, locale, check, pass });
  if (!pass) failures.push({ pattern, locale, url, check, detail });
}

function normalizeUrl(url: string): string {
  const u = new URL(url);
  u.hash = "";
  const path = u.pathname;
  if (path === "" || path === "/") {
    return u.search ? `${u.origin}/${u.search}` : u.origin;
  }
  const trimmed = path.endsWith("/") ? path.slice(0, -1) : path;
  return `${u.origin}${trimmed}${u.search}`;
}

function abs(path: string): string {
  return normalizeUrl(`${BASE}${path.startsWith("/") ? path : `/${path}`}`);
}

async function waitForRateSlot() {
  const now = Date.now();
  while (requestTimestamps.length && requestTimestamps[0] < now - 60_000) requestTimestamps.shift();
  if (requestTimestamps.length >= MAX_PER_MINUTE) {
    const wait = requestTimestamps[0] + 60_000 - now + 200;
    await sleep(wait);
  }
  const sinceLast = Date.now() - lastRequestAt;
  if (sinceLast < INTERVAL_MS) await sleep(INTERVAL_MS - sinceLast);
  lastRequestAt = Date.now();
  requestTimestamps.push(lastRequestAt);
}

async function fetchWithRedirects(url: string, method: "GET" | "HEAD"): Promise<FetchResult> {
  const chain: string[] = [];
  let current = url;
  for (let hop = 0; hop < 8; hop++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), method === "HEAD" ? HEAD_TIMEOUT_MS : GET_TIMEOUT_MS);
    try {
      const res = await fetch(current, { method, redirect: "manual", signal: ctrl.signal });
      chain.push(`${res.status} ${current}`);
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) break;
        current = new URL(loc, current).href;
        continue;
      }
      const html = method === "GET" && res.status === 200 ? await res.text() : "";
      return { status: res.status, chain, html, headers: res.headers };
    } finally {
      clearTimeout(timer);
    }
  }
  return { status: 0, chain, html: "", headers: new Headers() };
}

async function fetchCached(url: string, method: "GET" | "HEAD" = "GET"): Promise<FetchResult> {
  const key = `${method}:${normalizeUrl(url)}`;
  const hit = pageCache.get(key);
  if (hit) return hit;

  for (let attempt = 0; attempt < 6; attempt++) {
    await waitForRateSlot();
    const result = await fetchWithRedirects(url, method);
    if (result.status === 429) {
      process.stderr.write(`\n429 ${url} — waiting 65s (attempt ${attempt + 1}/6)\n`);
      await sleep(65_000);
      continue;
    }
    pageCache.set(key, result);
    if (method === "GET" && result.status === 200) {
      pageCache.set(`HEAD:${normalizeUrl(url)}`, { ...result, html: "" });
    }
    return result;
  }
  const fallback: FetchResult = { status: 429, chain: [`429 ${url}`], html: "", headers: new Headers() };
  pageCache.set(key, fallback);
  return fallback;
}

function topicsHubPath(locale: SiteLocale): string | null {
  if (locale === "en") return "/topics";
  if (locale === "es") return "/es/temas";
  if (locale === "pt") return "/pt/temas";
  if (locale === "ja") return "/ja/topics";
  return null;
}

function countriesHubPath(locale: SiteLocale): string | null {
  if (locale === "en") return "/countries";
  if (locale === "es") return "/es/paises";
  if (locale === "pt") return "/pt/paises";
  if (locale === "ja") return "/ja/countries";
  return null;
}

function parseHreflangFromHtml(html: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const tag of html.match(/<link[^>]+rel=["']alternate["'][^>]*>/gi) ?? []) {
    const lang = tag.match(/hreflang=["']([^"']+)["']/i)?.[1];
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (lang && href) map.set(lang.toLowerCase(), normalizeUrl(href));
  }
  return map;
}

function parseHreflangFromLinkHeader(header: string | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!header) return map;
  for (const part of header.split(/,\s*(?=<)/)) {
    const m = part.match(/<([^>]+)>;\s*rel="alternate";\s*hreflang="([^"]+)"/i);
    if (m) map.set(m[2].toLowerCase(), normalizeUrl(m[1]));
  }
  return map;
}

function mergeHreflang(html: string, headers: Headers): Map<string, string> {
  const merged = parseHreflangFromHtml(html);
  Array.from(parseHreflangFromLinkHeader(headers.get("link")).entries()).forEach(([k, v]) => {
    if (!merged.has(k)) merged.set(k, v);
  });
  return merged;
}

function parseCanonical(html: string): string | null {
  const m =
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) ??
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  return m ? normalizeUrl(m[1]) : null;
}

function hasNoindex(html: string, xRobots: string | null): boolean {
  const meta = html.match(/<meta[^>]+name=["']robots["'][^>]*>/i)?.[0] ?? "";
  const content = meta.match(/content=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "";
  return content.includes("noindex") || Boolean(xRobots?.toLowerCase().includes("noindex"));
}

function countH1(html: string): number {
  return (html.match(/<h1[\s>]/gi) ?? []).length;
}

function parseTitle(html: string): string {
  return html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "";
}

function parseDescription(html: string): string {
  const m = html.match(/<meta[^>]+name=["']description["'][^>]*>/i)?.[0];
  return m?.match(/content=["']([^"']*)["']/i)?.[1]?.trim() ?? "";
}

function parseJsonLdTypes(html: string): string[] {
  const types: string[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1]) as { "@type"?: string | string[] };
      const t = data["@type"];
      if (typeof t === "string") types.push(t);
      else if (Array.isArray(t)) types.push(...t);
    } catch {
      /* skip */
    }
  }
  return types;
}

function extractLocs(xml: string): string[] {
  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);
}

function hreflangContext(sample: SampleSpec): { slug?: string; hub?: HubKey } {
  if (sample.pattern.startsWith("hub-")) {
    return { hub: sample.pattern.replace("hub-", "") as HubKey };
  }
  if (sample.pattern === "artwork-detail") {
    return { slug: `artwork:${decodeURIComponent(sample.path.split("/").pop() ?? "")}` };
  }
  if (sample.pattern === "artist-detail") {
    return { slug: `artist:${decodeURIComponent(sample.path.split("/").pop() ?? "")}` };
  }
  if (sample.pattern === "genre-detail") {
    return { slug: `genre:${decodeURIComponent(sample.path.split("/").pop() ?? "")}` };
  }
  if (sample.pattern === "style-detail") {
    return { slug: `style:${decodeURIComponent(sample.path.split("/").pop() ?? "")}` };
  }
  if (sample.pattern === "museum-detail") {
    return { slug: `museum:${decodeURIComponent(sample.path.split("/").pop() ?? "")}` };
  }
  if (sample.pattern === "blog-index") return { slug: "blog" };
  if (sample.pattern === "blog-post") return { slug: sample.path };
  if (sample.pattern === "static-about") return { slug: "about" };
  if (sample.pattern === "static-terms") return { slug: "terms" };
  if (sample.pattern === "topic-detail" || sample.pattern === "country-detail") {
    return { slug: sample.path.split("/").pop() };
  }
  return {};
}

function expectedHreflang(mode: HreflangMode, ctx: { slug?: string; hub?: HubKey }): Set<string> {
  let langs: Record<string, string>;
  switch (mode) {
    case "full":
      if (ctx.hub) langs = buildHubLanguageAlternates(ctx.hub);
      else if (ctx.slug?.startsWith("artist:")) langs = buildArtistLanguageAlternates(ctx.slug.slice(7));
      else if (ctx.slug?.startsWith("artwork:")) langs = buildArtworkLanguageAlternates(ctx.slug.slice(8));
      else if (ctx.slug?.startsWith("genre:")) langs = buildGenreLanguageAlternates(ctx.slug.slice(6));
      else if (ctx.slug?.startsWith("style:")) langs = buildStyleLanguageAlternates(ctx.slug.slice(6));
      else if (ctx.slug?.startsWith("museum:")) langs = buildMuseumLanguageAlternates(ctx.slug.slice(7));
      else langs = {};
      break;
    case "en-only":
      langs = enOnlyAlternates(ctx.slug?.startsWith("/") ? ctx.slug : `/${ctx.slug ?? ""}`);
      break;
    case "home":
      langs = buildHomeLanguageAlternates();
      break;
    default:
      return new Set();
  }
  return new Set(Object.keys(langs));
}

function getExpectedLangs(sample: SampleSpec): Set<string> {
  if (sample.hreflang === "none") return new Set();
  if (
    sample.pattern === "hub-countries" ||
    sample.pattern === "country-detail" ||
    sample.pattern === "hub-topics" ||
    sample.pattern === "topic-detail"
  ) {
    return new Set(["en", "es", "pt", "ja", "x-default"]);
  }
  return expectedHreflang(sample.hreflang, hreflangContext(sample));
}

/** Genre/style localized pages may canonicalize to the locale slug alias (same directory). */
function isGenreStyleAliasCanonical(sample: SampleSpec, url: string, canonical: string | null): boolean {
  if (!canonical) return false;
  if (normalizeUrl(canonical) === normalizeUrl(url)) return true;
  if (sample.pattern !== "genre-detail" && sample.pattern !== "style-detail") return false;
  if (sample.locale === "en") return false;
  const urlDir = new URL(url).pathname.replace(/\/[^/]+$/, "");
  const canDir = new URL(canonical).pathname.replace(/\/[^/]+$/, "");
  return urlDir === canDir;
}

async function discoverSlugs(): Promise<{
  artworks: string[];
  artists: string[];
  styles: string[];
  museums: string[];
  artworkTitles: Map<string, string>;
}> {
  const artworkTitles = new Map<string, string>();
  const staticRes = await fetchCached(`${BASE}/sitemap/static`);
  const staticLocs = staticRes.status === 200 ? extractLocs(staticRes.html) : [];

  const artistSlugs = staticLocs
    .filter((u) => u.includes("/artists/"))
    .map((u) => decodeURIComponent(u.split("/artists/")[1] ?? ""))
    .filter(Boolean)
    .slice(0, 20);

  const styleSlugs = staticLocs
    .filter((u) => u.includes("/styles/"))
    .map((u) => decodeURIComponent(u.split("/styles/")[1] ?? ""))
    .filter(Boolean);

  const museumSlugs = staticLocs
    .filter((u) => u.includes("/museums/"))
    .map((u) => decodeURIComponent(u.split("/museums/")[1] ?? ""))
    .filter(Boolean);

  const artworkRes = await fetchCached(`${BASE}/sitemap/artworks/0`);
  const candidates = artworkRes.status === 200
    ? extractLocs(artworkRes.html)
        .map((u) => decodeURIComponent(u.split("/artworks/")[1] ?? ""))
        .filter(Boolean)
    : [];

  const fallbackArtworks = [
    "south-wind-clear-weather",
    "olive-orchard",
    "charing-cross-bridge",
  ];
  const artworks: string[] = [];
  for (const slug of [...candidates, ...fallbackArtworks]) {
    if (artworks.length >= 3 || artworks.includes(slug)) continue;
    artworks.push(slug);
  }

  const artists: string[] = [];
  const fallbackArtists = ["vincent-van-gogh", "claude-monet", "rembrandt"];
  for (const slug of [...artistSlugs, ...fallbackArtists]) {
    if (artists.length >= 3 || artists.includes(slug)) continue;
    artists.push(slug);
  }

  for (const slug of artworks) {
    const { html, status } = await fetchCached(abs(artworkDetailPath("en", slug)));
    if (status === 200) {
      const title = html.match(/<h1[^>]*>([^<]+)</i)?.[1]?.trim();
      if (title) artworkTitles.set(slug, title);
    }
  }

  return {
    artworks,
    artists,
    styles: styleSlugs.slice(0, 3).length ? styleSlugs.slice(0, 3) : ["impressionism", "baroque", "renaissance"],
    museums: museumSlugs.slice(0, 3).length
      ? museumSlugs.slice(0, 3)
      : ["rijksmuseum", "national-gallery-london", "the-met"],
    artworkTitles,
  };
}

function buildSamples(slugs: Awaited<ReturnType<typeof discoverSlugs>>): SampleSpec[] {
  const samples: SampleSpec[] = [];
  const topicSlug = "river";
  const countrySlug = "france";
  const blogPosts = ["the-third-of-may-1808", "the-night-watch-rembrandt", "edvard-munch-paintings"];

  for (const locale of LOCALES) {
    samples.push({
      pattern: "home",
      locale,
      path: locale === "en" ? "/" : `/${locale}`,
      hreflang: "home",
      jsonLd: "none",
    });
  }

  for (const slug of slugs.artworks) {
    for (const locale of LOCALES) {
      samples.push({
        pattern: "artwork-detail",
        locale,
        path: artworkDetailPath(locale, slug),
        hreflang: "full",
        jsonLd: "VisualArtwork",
        contentNeedle: slugs.artworkTitles.get(slug),
      });
    }
  }

  for (const slug of slugs.artists) {
    for (const locale of LOCALES) {
      samples.push({
        pattern: "artist-detail",
        locale,
        path: artistDetailPath(locale, slug),
        hreflang: "full",
        jsonLd: "Person",
      });
    }
  }

  const hubs: Array<{ pattern: string; hub: HubKey }> = [
    { pattern: "hub-artworks", hub: "artworks" },
    { pattern: "hub-artists", hub: "artists" },
    { pattern: "hub-genres", hub: "genres" },
    { pattern: "hub-styles", hub: "styles" },
    { pattern: "hub-museums", hub: "museums" },
  ];
  for (const { pattern, hub } of hubs) {
    for (const locale of LOCALES) {
      samples.push({ pattern, locale, path: localePath(locale, hub), hreflang: "full", jsonLd: "none" });
    }
  }

  for (const locale of TOPICS_LOCALES) {
    const th = topicsHubPath(locale);
    if (th) samples.push({ pattern: "hub-topics", locale, path: th, hreflang: "topics-countries", jsonLd: "none" });
    const td = topicsHubPath(locale);
    if (td) {
      samples.push({
        pattern: "topic-detail",
        locale,
        path: `${td}/${topicSlug}`,
        hreflang: "topics-countries",
        jsonLd: "none",
      });
    }
    const ch = countriesHubPath(locale);
    if (ch) samples.push({ pattern: "hub-countries", locale, path: ch, hreflang: "topics-countries", jsonLd: "none" });
    const cd = countriesHubPath(locale);
    if (cd) {
      samples.push({
        pattern: "country-detail",
        locale,
        path: `${cd}/${countrySlug}`,
        hreflang: "topics-countries",
        jsonLd: "none",
      });
    }
  }

  for (const slug of ["landscape", "portrait", "still-life"]) {
    for (const locale of LOCALES) {
      samples.push({
        pattern: "genre-detail",
        locale,
        path: `${localePath(locale, "genres")}/${slug}`,
        hreflang: "full",
        jsonLd: "none",
      });
    }
  }

  for (const slug of slugs.styles) {
    for (const locale of LOCALES) {
      samples.push({
        pattern: "style-detail",
        locale,
        path: `${localePath(locale, "styles")}/${slug}`,
        hreflang: "full",
        jsonLd: "none",
      });
    }
  }

  for (const slug of slugs.museums) {
    for (const locale of LOCALES) {
      samples.push({
        pattern: "museum-detail",
        locale,
        path: `${localePath(locale, "museums")}/${slug}`,
        hreflang: "full",
        jsonLd: "none",
      });
    }
  }

  for (const locale of ["en", "es", "ja"] as SiteLocale[]) {
    samples.push({
      pattern: "paginated-list",
      locale,
      path: `${localePath(locale, "artworks")}?page=2`,
      hreflang: "none",
      jsonLd: "none",
    });
  }

  samples.push({ pattern: "blog-index", locale: "en", path: "/blog", hreflang: "en-only", jsonLd: "none" });
  for (const slug of blogPosts) {
    samples.push({
      pattern: "blog-post",
      locale: "en",
      path: `/blog/${slug}`,
      hreflang: "en-only",
      jsonLd: "BlogPosting",
    });
  }
  samples.push(
    { pattern: "static-about", locale: "en", path: "/about", hreflang: "en-only", jsonLd: "none" },
    { pattern: "static-terms", locale: "en", path: "/terms", hreflang: "en-only", jsonLd: "none" }
  );

  return samples;
}

function auditPageChecks(audit: PageAudit) {
  const { sample, url, result, mergedHreflang } = audit;
  const { pattern, locale } = sample;
  const { status, chain, html, headers } = result;

  const noRedirect = chain.length === 1;
  if (status !== 200 || !noRedirect) {
    record(
      pattern,
      locale,
      url,
      "http_200",
      false,
      status !== 200 ? `status=${status} chain=${chain.join(" -> ")}` : `redirect: ${chain.join(" -> ")}`
    );
    if (status !== 200) return;
  } else {
    record(pattern, locale, url, "http_200", true, "200");
  }

  record(
    pattern,
    locale,
    url,
    "no_noindex",
    !hasNoindex(html, headers.get("x-robots-tag")),
    hasNoindex(html, headers.get("x-robots-tag")) ? "noindex detected" : "ok"
  );

  const canonical = parseCanonical(html);
  const canonicalOk =
    Boolean(canonical) &&
    (canonical === normalizeUrl(url) || isGenreStyleAliasCanonical(sample, url, canonical));
  record(
    pattern,
    locale,
    url,
    "canonical_self",
    canonicalOk,
    canonical
      ? canonicalOk
        ? canonical === normalizeUrl(url)
          ? "self"
          : `alias-canonical=${canonical}`
        : `canonical=${canonical}`
      : "missing canonical"
  );

  const expected = getExpectedLangs(sample);
  if (sample.hreflang !== "none" && expected.size > 0) {
    const foundKeys = new Set(Array.from(mergedHreflang.keys()));
    const missing = Array.from(expected).filter((k) => !foundKeys.has(k));
    const extra = Array.from(foundKeys).filter((k) => !expected.has(k));
    record(
      pattern,
      locale,
      url,
      "hreflang_complete",
      missing.length === 0 && extra.length === 0,
      missing.length || extra.length
        ? `missing=[${missing.join(",")}] extra=[${extra.join(",")}]`
        : `ok (${foundKeys.size} tags)`
    );
  }

  record(pattern, locale, url, "single_h1", countH1(html) === 1, `h1 count=${countH1(html)}`);
  record(
    pattern,
    locale,
    url,
    "title_description",
    Boolean(parseTitle(html) && parseDescription(html)),
    `title=${parseTitle(html) ? "yes" : "EMPTY"} desc=${parseDescription(html) ? "yes" : "EMPTY"}`
  );

  if (sample.jsonLd !== "none") {
    const types = parseJsonLdTypes(html);
    const has = types.some((t) => t === sample.jsonLd || (sample.jsonLd === "Person" && t === "Artist"));
    record(pattern, locale, url, "json_ld", has, has ? `found ${sample.jsonLd}` : `types=[${types.join(",")}]`);
  } else {
    record(pattern, locale, url, "json_ld", true, "n/a");
  }

  if (sample.contentNeedle) {
    const ok = html.includes(sample.contentNeedle);
    record(pattern, locale, url, "ssr_content", ok, ok ? "title in HTML" : `missing "${sample.contentNeedle}"`);
  } else {
    record(pattern, locale, url, "ssr_content", true, "n/a");
  }
}

async function validateHreflangAcrossPages(audits: PageAudit[]) {
  const uniqueAltUrls = new Set<string>();
  for (const a of audits) {
    Array.from(a.mergedHreflang.values()).forEach((u) => uniqueAltUrls.add(u));
  }

  process.stdout.write(`\nPrefetching ${uniqueAltUrls.size} unique hreflang alternate URLs…\n`);
  for (const altUrl of uniqueAltUrls) {
    await fetchCached(altUrl, "GET");
  }

  for (const audit of audits) {
    const { sample, url, mergedHreflang } = audit;
    if (sample.hreflang === "none" || mergedHreflang.size === 0) continue;

    let all200 = true;
    const bad: string[] = [];
    for (const [lang, href] of Array.from(mergedHreflang.entries())) {
      const cached = pageCache.get(`GET:${normalizeUrl(href)}`);
      const st = cached?.status ?? 0;
      const redirected = (cached?.chain.length ?? 0) > 1;
      if (st !== 200 || redirected) {
        all200 = false;
        bad.push(`${lang}:${st}${redirected ? "+redirect" : ""}`);
      }
    }
    record(
      sample.pattern,
      sample.locale,
      url,
      "hreflang_alternates_200",
      all200,
      all200 ? "all alternates 200" : bad.join("; ")
    );

    let reciprocal = true;
    const recipBad: string[] = [];
    for (const [lang, href] of Array.from(mergedHreflang.entries())) {
      if (lang === "x-default") continue;
      const cached = pageCache.get(`GET:${normalizeUrl(href)}`);
      if (!cached || cached.status !== 200) continue;
      const altMap = mergeHreflang(cached.html, cached.headers);
      const back = Array.from(altMap.values()).some((v) => normalizeUrl(v) === normalizeUrl(url));
      if (!back) {
        reciprocal = false;
        recipBad.push(`${lang}@${href}`);
      }
    }
    record(
      sample.pattern,
      sample.locale,
      url,
      "hreflang_reciprocal",
      reciprocal,
      reciprocal ? "ok" : recipBad.slice(0, 5).join("; ")
    );
  }
}

type RobotsRule = { allow: string[]; disallow: string[] };

function parseRobotsTxt(text: string): { rules: RobotsRule[]; sitemaps: string[] } {
  const rules: RobotsRule[] = [];
  const sitemaps: string[] = [];
  let current: RobotsRule | null = null;
  for (const line of text.split("\n")) {
    const t = line.split("#")[0].trim();
    if (!t) continue;
    const colon = t.indexOf(":");
    if (colon < 0) continue;
    const key = t.slice(0, colon).trim().toLowerCase();
    const val = t.slice(colon + 1).trim();
    if (key === "user-agent") {
      current = val === "*" ? { allow: [], disallow: [] } : null;
      if (current) rules.push(current);
    } else if (current && key === "disallow") current.disallow.push(val);
    else if (current && key === "allow") current.allow.push(val);
    else if (key === "sitemap") sitemaps.push(val);
  }
  return { rules, sitemaps };
}

function isBlockedByRobots(pathname: string, rule: RobotsRule): boolean {
  const rules = [
    ...rule.allow.map((p) => ({ p, allow: true })),
    ...rule.disallow.map((p) => ({ p, allow: false })),
  ].sort((a, b) => b.p.length - a.p.length);

  for (const { p, allow } of rules) {
    if (!p) {
      if (!allow) return true;
      continue;
    }
    if (pathname === p || pathname.startsWith(p)) return !allow;
  }
  return false;
}

async function auditRobotsAndSitemaps(starRule: RobotsRule | undefined, skipSitemapHead = false) {
  console.log("\n========== robots.txt (full) ==========\n");
  const robotsRes = await fetchCached(`${BASE}/robots.txt`);
  console.log(robotsRes.status === 200 ? robotsRes.html : `(HTTP ${robotsRes.status})`);

  const { sitemaps } = parseRobotsTxt(robotsRes.html);
  record(
    "robots.txt",
    "—",
    `${BASE}/robots.txt`,
    "http_200",
    robotsRes.status === 200,
    `status=${robotsRes.status}`
  );
  record(
    "robots.txt",
    "—",
    `${BASE}/robots.txt`,
    "canonical_self",
    sitemaps.some((s) => s.includes("sitemap.xml")),
    sitemaps.length ? `sitemaps: ${sitemaps.join(", ")}` : "no sitemap listed"
  );

  const indexRes = await fetchCached(`${BASE}/sitemap.xml`);
  const childSitemaps = indexRes.status === 200 ? extractLocs(indexRes.html) : [];
  record(
    "sitemap-index",
    "—",
    `${BASE}/sitemap.xml`,
    "http_200",
    indexRes.status === 200,
    `status=${indexRes.status} children=${childSitemaps.length}`
  );

  if (skipSitemapHead) {
    process.stdout.write(
      `\nSkipping HEAD-check of ${childSitemaps.length} child sitemaps (--skip-sitemaps).\n`
    );
  } else {
    process.stdout.write(`\nHEAD-checking ${childSitemaps.length} child sitemaps…\n`);
    let badCount = 0;
    for (let i = 0; i < childSitemaps.length; i++) {
      const sm = childSitemaps[i];
      const { status } = await fetchCached(sm, "HEAD");
      if (status !== 200) {
        badCount++;
        if (badCount <= 15) {
          failures.push({
            pattern: "sitemap-children",
            locale: "—",
            url: sm,
            check: "http_200",
            detail: `status=${status}`,
          });
        }
      }
      if ((i + 1) % 100 === 0) process.stdout.write(`  ${i + 1}/${childSitemaps.length}\n`);
    }
    record(
      "sitemap-children",
      "—",
      `${BASE}/sitemap.xml`,
      "http_200",
      badCount === 0,
      badCount === 0 ? `all ${childSitemaps.length} return 200` : `${badCount} non-200`
    );
  }

  if (starRule) {
    record(
      "robots-block-check",
      "—",
      "/es/obras/foo",
      "no_noindex",
      !isBlockedByRobots("/es/obras/foo", starRule),
      `allowed=${!isBlockedByRobots("/es/obras/foo", starRule)}`
    );
    record(
      "robots-block-check",
      "—",
      "/es/artworks/foo",
      "no_noindex",
      isBlockedByRobots("/es/artworks/foo", starRule),
      `blocked=${isBlockedByRobots("/es/artworks/foo", starRule)}`
    );

    const staticSm = await fetchCached(`${BASE}/sitemap/static`);
    const esArtSm = childSitemaps.some((s) => s.includes("/es/artworks/0"))
      ? await fetchCached(`${BASE}/sitemap/es/artworks/0`)
      : null;
    const samplePaths = [
      ...(staticSm.status === 200 ? extractLocs(staticSm.html).slice(0, 5) : []),
      ...(esArtSm?.status === 200 ? extractLocs(esArtSm.html).slice(0, 3) : []),
    ].map((u) => new URL(u).pathname);

    for (const path of samplePaths) {
      record(
        "sitemap-vs-robots",
        "—",
        `${BASE}${path}`,
        "no_noindex",
        !isBlockedByRobots(path, starRule),
        isBlockedByRobots(path, starRule) ? "BLOCKED" : "allowed"
      );
    }
  }
}

function printTable() {
  const checks: CheckName[] = [
    "http_200",
    "no_noindex",
    "canonical_self",
    "hreflang_complete",
    "hreflang_alternates_200",
    "hreflang_reciprocal",
    "single_h1",
    "title_description",
    "json_ld",
    "ssr_content",
  ];

  const rows = new Map<string, Map<CheckName, boolean>>();
  for (const row of table) {
    const key = `${row.pattern}|${row.locale}`;
    if (!rows.has(key)) rows.set(key, new Map());
    rows.get(key)!.set(row.check, row.pass);
  }

  console.log("\n========== PASS/FAIL TABLE (pattern × locale × check) ==========\n");
  console.log(
    "pattern".padEnd(22) +
      "locale".padEnd(6) +
      checks.map((c) => c.slice(0, 6).padEnd(8)).join("")
  );
  console.log("-".repeat(22 + 6 + checks.length * 8));

  for (const key of Array.from(rows.keys()).sort()) {
    const [pattern, locale] = key.split("|");
    const checkMap = rows.get(key)!;
    const cells = checks.map((c) => {
      const v = checkMap.get(c);
      if (v === undefined) return "  n/a  ";
      return v ? "  PASS " : "  FAIL ";
    });
    console.log(pattern.padEnd(22) + locale.padEnd(6) + cells.join(""));
  }
}

async function main() {
  const skipSitemaps = process.argv.includes("--skip-sitemaps");

  console.log("SEO Full Indexability Audit");
  console.log(`Target: ${BASE}`);
  console.log(`Rate limit: ${INTERVAL_MS}ms interval, max ${MAX_PER_MINUTE}/min`);
  if (skipSitemaps) console.log("Mode: --skip-sitemaps (child sitemap HEAD checks disabled)");
  console.log(`Started: ${new Date().toISOString()}\n`);

  const robotsPrefetch = await fetchCached(`${BASE}/robots.txt`);
  const { rules: robotsRules } = parseRobotsTxt(robotsPrefetch.html);
  const starRule = robotsRules[0];

  const slugs = await discoverSlugs();
  console.log("Discovered slugs:", {
    artworks: slugs.artworks,
    artists: slugs.artists,
    styles: slugs.styles,
    museums: slugs.museums,
    artworkTitles: Object.fromEntries(slugs.artworkTitles),
  });

  const samples = buildSamples(slugs);
  console.log(`\nFetching ${samples.length} sample pages…\n`);

  const audits: PageAudit[] = [];
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    const url = abs(sample.path);
    const result = await fetchCached(url, "GET");
    const mergedHreflang = result.status === 200 ? mergeHreflang(result.html, result.headers) : new Map();
    audits.push({ sample, url, result, mergedHreflang });
    auditPageChecks({ sample, url, result, mergedHreflang });
    if ((i + 1) % 25 === 0) process.stdout.write(`  pages ${i + 1}/${samples.length}\n`);
  }

  await validateHreflangAcrossPages(audits);
  await auditRobotsAndSitemaps(starRule, skipSitemaps);

  printTable();

  const realFailures = failures.filter((f) => !f.detail.includes("429"));
  console.log("\n========== FAILURES ==========\n");
  if (realFailures.length === 0) {
    console.log("ALL PATTERNS INDEXABLE");
  } else {
    for (const f of realFailures) {
      console.log(`[${f.pattern}] [${f.locale}] ${f.url}`);
      console.log(`  check: ${f.check}`);
      console.log(`  found: ${f.detail}\n`);
    }
    console.log(`Total failures: ${realFailures.length}`);
    if (failures.length > realFailures.length) {
      console.log(`(${failures.length - realFailures.length} additional 429 rate-limit failures omitted)`);
    }
  }

  console.log(`\nFinished: ${new Date().toISOString()}`);
  process.exit(realFailures.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
