#!/usr/bin/env node
/**
 * Scrapes Artvee's full artist directory (https://artvee.com/artists/, 30 per
 * page) into imports/artvee/artvee-artists.json. Read-only reconnaissance —
 * we never import Artvee's own images (their PD claims aren't independently
 * verified); this just gives us artist NAMES to check against Wikidata/Commons
 * via the existing import-wikipedia.mjs pipeline.
 *
 * Artvee's Cloudflare rule blocks headless-browser fingerprints but not plain
 * fetch with a normal browser User-Agent (confirmed 16 Sep 2026).
 *
 * Run: node scripts/scrape-artvee-artists.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const OUT = "imports/artvee/artvee-artists.json";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** One card's markup:
 * <a href="https://artvee.com/artist/alphonse-mucha/">
 *   <h3 class="category-title">
 *     <span>Alphonse Mucha</span><mark class="count">Czech, 203 Items</mark>
 *   </h3></a>
 */
const CARD_RE =
  /<a href="https:\/\/artvee\.com\/artist\/([a-z0-9-]+)\/">\s*<h3 class="category-title">\s*<span>([^<]*)<\/span>(?:<mark class="count">([^<]*)<\/mark>)?/g;

/** The card text is raw HTML — WordPress renders apostrophes etc. as entities
 *  ("Prud&#039;hon"). Decode the handful that actually show up in artist names. */
function decodeEntities(s) {
  return s
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "’")
    .replace(/&eacute;/g, "é")
    .replace(/&egrave;/g, "è");
}

function parsePage(html) {
  const out = [];
  for (const m of html.matchAll(CARD_RE)) {
    const [, slug, name, meta] = m;
    let nationality = null, items = null;
    if (meta) {
      const parts = meta.split(",").map((s) => s.trim());
      items = parseInt((parts.pop() || "").replace(/[^\d]/g, ""), 10) || null;
      nationality = parts.join(", ") || null;
    }
    out.push({ slug, name: decodeEntities(name.trim()), nationality, items });
  }
  return out;
}

async function fetchPage(n) {
  const url = n === 1 ? "https://artvee.com/artists/" : `https://artvee.com/artists/page/${n}/`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (res.status === 404) return null; // past the last page
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
}

async function run() {
  const bySlug = new Map();
  let page = 1;
  for (;;) {
    const html = await fetchPage(page);
    if (html === null) {
      console.log(`page ${page}: 404 — stopping.`);
      break;
    }
    const found = parsePage(html);
    if (found.length === 0) {
      console.log(`page ${page}: 0 cards — stopping.`);
      break;
    }
    let added = 0;
    for (const a of found) {
      if (!bySlug.has(a.slug)) { bySlug.set(a.slug, a); added++; }
    }
    console.log(`page ${page}: ${found.length} cards (${added} new) — total ${bySlug.size}`);
    if (added === 0) {
      console.log("No new artists on this page — reached the end (pagination looped).");
      break;
    }
    page++;
    await sleep(400); // polite pacing
  }

  const artists = [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name));
  mkdirSync("imports/artvee", { recursive: true });
  writeFileSync(OUT, JSON.stringify(artists, null, 2));
  console.log(`\nSaved ${artists.length} artists -> ${OUT}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
