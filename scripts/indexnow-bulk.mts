/**
 * Submit the FULL catalog to IndexNow (Bing/Yahoo): artworks + artists across
 * all 10 locales plus the hub pages — ~1.1M URLs.
 *
 * Lives here (a CI job) rather than as an API route: it holds every URL in
 * memory and runs for minutes, which no request handler should do.
 *
 * Run:  npx tsx scripts/indexnow-bulk.mts            dry run — counts only
 *       npx tsx scripts/indexnow-bulk.mts --submit   actually submits
 * Env:  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY),
 *       INDEXNOW_KEY (only for --submit)
 */
import { readdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

import { HREFLANG_LOCALES, LOCALE_ROUTE_CONFIG, type SiteLocale } from "../lib/locale-routes";
import { slugify } from "../lib/utils";

const BASE = "https://fineartfree.com";
const SUBMIT = process.argv.includes("--submit");
const BATCH = 10000; // IndexNow's per-request cap

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY.");
  process.exit(1);
}

// The IndexNow key is public by design (the site serves it at /<key>.txt), so
// default to the key file in public/ — no secret to configure.
const indexNowKey =
  process.env.INDEXNOW_KEY ||
  readdirSync("public")
    .find((f) => /^faf-indexnow-.*\.txt$/.test(f))
    ?.replace(/\.txt$/, "");
if (SUBMIT && !indexNowKey) {
  console.error("--submit: no INDEXNOW_KEY env and no public/faf-indexnow-*.txt key file found.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

function detailLoc(locale: SiteLocale, kind: "artworks" | "artists", slug: string): string {
  const encoded = encodeURIComponent(slug);
  if (locale === "en") return `${BASE}/${kind}/${encoded}`;
  const { prefix, segments } = LOCALE_ROUTE_CONFIG[locale];
  return `${BASE}${prefix}/${segments[kind]}/${encoded}`;
}

const allUrls: string[] = [];

for (const locale of HREFLANG_LOCALES) {
  if (locale === "en") {
    allUrls.push(BASE, `${BASE}/artworks`, `${BASE}/artists`, `${BASE}/museums`, `${BASE}/genres`, `${BASE}/styles`);
    continue;
  }
  const { prefix, segments } = LOCALE_ROUTE_CONFIG[locale];
  allUrls.push(
    `${BASE}${prefix}`,
    `${BASE}${prefix}/${segments.artworks}`,
    `${BASE}${prefix}/${segments.artists}`,
    `${BASE}${prefix}/${segments.museums}`,
    `${BASE}${prefix}/${segments.genres}`,
    `${BASE}${prefix}/${segments.styles}`
  );
}

// Keyset pagination on id — a plain OFFSET scan hits the statement timeout past ~80k rows.
const artistSlugs = new Set<string>();
let artworkCount = 0;
let cursor = 0;
for (;;) {
  const { data, error } = await supabase
    .from("artworks")
    .select("id, slug, artist_display")
    .order("id", { ascending: true })
    .gt("id", cursor)
    .limit(1000);
  if (error) throw error;
  if (!data || data.length === 0) break;

  for (const row of data as Array<{ id: number; slug: string | null; artist_display: string | null }>) {
    if (row.slug) {
      artworkCount++;
      for (const locale of HREFLANG_LOCALES) allUrls.push(detailLoc(locale, "artworks", row.slug));
    }
    const artist = row.artist_display?.trim();
    if (artist && !/^https?:\/\//i.test(artist)) {
      const seg = slugify(artist);
      if (seg) artistSlugs.add(seg);
    }
  }
  cursor = data[data.length - 1].id;
  if (data.length < 1000) break;
}

for (const seg of artistSlugs) {
  for (const locale of HREFLANG_LOCALES) allUrls.push(detailLoc(locale, "artists", seg));
}

console.log(`artworks=${artworkCount} artists=${artistSlugs.size} urls=${allUrls.length}`);

if (!SUBMIT) {
  console.log("Dry run — pass --submit to send to IndexNow.");
  process.exit(0);
}

let submitted = 0;
let failed = 0;
for (let i = 0; i < allUrls.length; i += BATCH) {
  const batch = allUrls.slice(i, i + BATCH);
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      host: "fineartfree.com",
      key: indexNowKey,
      keyLocation: `${BASE}/${indexNowKey}.txt`,
      urlList: batch,
    }),
  });
  const ok = res.status === 200 || res.status === 202;
  if (ok) submitted += batch.length;
  else failed += batch.length;
  console.log(`batch ${i / BATCH + 1}: HTTP ${res.status} (${batch.length} urls)`);
  await new Promise((r) => setTimeout(r, 200));
}

console.log(`Submitted ${submitted} URLs to IndexNow (${failed} failed)`);
if (failed > 0) process.exit(1);
