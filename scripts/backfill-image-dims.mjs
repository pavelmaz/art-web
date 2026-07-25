#!/usr/bin/env node
/**
 * Backfill artworks.img_width / img_height (original pixel dimensions) by probing
 * image HEADERS only (a few KB per file — probe-image-size aborts the download as
 * soon as dimensions are known). Supabase-hosted files probe via the CDN (R2,
 * zero egress); external files (artic IIIF, wikimedia thumbs) probe directly and
 * also fill orig_bytes from content-length when missing.
 *
 * Resumable/idempotent: only touches rows where img_width IS NULL.
 * Run: node --env-file=.env.local scripts/backfill-image-dims.mjs
 */
import { createClient } from "@supabase/supabase-js";
import probe from "probe-image-size";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const CDN = "https://cdn.fineartfree.com/";
const CONCURRENCY = Number(process.env.DIMS_CONCURRENCY ?? 12);
const UA = "FineArtFree-dims/1.0 (https://fineartfree.com; pavelmazuelas@gmail.com)";
// artic.edu's IIIF endpoint 403s non-browser clients — send browser-like headers there.
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function headersFor(url) {
  if (url.includes("artic.edu")) {
    return {
      "User-Agent": BROWSER_UA,
      Accept: "image/avif,image/webp,image/*,*/*",
      Referer: "https://www.artic.edu/",
    };
  }
  return { "User-Agent": UA };
}

function probeUrl(imageId) {
  if (!imageId) return null;
  if (imageId.includes("supabase.co/")) {
    return imageId.replace(/^https:\/\/[a-z0-9-]+\.supabase\.co\//i, CDN).split("?")[0];
  }
  if (imageId.startsWith("http://") || imageId.startsWith("https://")) {
    return imageId;
  }
  return `https://www.artic.edu/iiif/2/${imageId}/full/843,/0/default.jpg`;
}

let done = 0, fail = 0, lastId = "";
const failures = [];

async function worker(queue) {
  for (;;) {
    const row = queue.shift();
    if (!row) return;
    const url = probeUrl(row.image_id);
    if (!url) { fail++; continue; }
    try {
      const info = await probe(url, { headers: headersFor(url) });
      const patch = { img_width: info.width, img_height: info.height };
      if (row.orig_bytes == null && Number.isFinite(info.length) && info.length > 0) {
        patch.orig_bytes = info.length;
      }
      const { error } = await supabase.from("artworks").update(patch).eq("id", row.id);
      if (error) throw new Error(error.message);
      done++;
    } catch (e) {
      fail++;
      if (failures.length < 20) failures.push(`${row.slug}: ${e.message}`);
    }
    if ((done + fail) % 500 === 0) console.log(`progress done=${done} fail=${fail}`);
  }
}

for (;;) {
  const { data: rows, error } = await supabase
    .from("artworks")
    .select("id, slug, image_id, orig_bytes")
    .is("img_width", null)
    .not("image_id", "is", null)
    .gt("id", lastId)
    .order("id", { ascending: true })
    .limit(1000);
  if (error) throw error;
  if (!rows?.length) break;
  lastId = rows[rows.length - 1].id;
  const queue = [...rows];
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));
  console.log(`batch complete through id=${lastId}  done=${done} fail=${fail}`);
}

console.log(`DIMS BACKFILL COMPLETE done=${done} fail=${fail}`);
for (const f of failures) console.log(" -", f);
