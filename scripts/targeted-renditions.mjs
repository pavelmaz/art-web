#!/usr/bin/env node
/** Targeted rendition pass: reads a newline-separated list of source keys
 *  (artworks/<hash>.<ext>) from the file given as argv[2] and generates any
 *  missing variants for just those files. Same variants/logic as
 *  generate-image-renditions.mjs — use that for full-catalog backfills. */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = "art-images";
const CONCURRENCY = 8;

const VARIANTS = [
  { key: "w800", width: 800, quality: 75, format: "webp" },
  { key: "w1400", width: 1400, quality: 80, format: "webp" },
  { key: "og1200", width: 1200, quality: 80, format: "jpeg" },
];

const listFile = process.argv[2];
if (!SUPABASE_URL || !SERVICE_KEY || !listFile) {
  console.error("usage: node --env-file=.env.local scripts/targeted-renditions.mjs <keys-file>");
  process.exit(1);
}
const sources = readFileSync(listFile, "utf-8").split("\n").map((l) => l.trim()).filter(Boolean);
console.log(`targeted pass over ${sources.length} sources`);

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function renditionKey(v, sourceKey) {
  const ext = v.format === "jpeg" ? ".jpg" : ".webp";
  return `renditions/${v.key}/${sourceKey.replace(/\.[a-z0-9]+$/i, ext)}`;
}

let done = 0, skip = 0, err = 0, cursor = 0;
const errors = [];

async function exists(key) {
  const dir = key.slice(0, key.lastIndexOf("/"));
  const name = key.slice(key.lastIndexOf("/") + 1);
  const { data } = await supabase.storage.from(BUCKET).list(dir, { search: name, limit: 1 });
  return Boolean(data?.some((f) => f.name === name));
}

async function processOne(sourceKey) {
  const missing = [];
  for (const v of VARIANTS) {
    if (!(await exists(renditionKey(v, sourceKey)))) missing.push(v);
  }
  if (!missing.length) return "skip";
  const { data, error } = await supabase.storage.from(BUCKET).download(sourceKey);
  if (error) throw new Error(`download: ${error.message}`);
  const input = Buffer.from(await data.arrayBuffer());
  for (const v of missing) {
    const pipeline = sharp(input, { limitInputPixels: false })
      .rotate()
      .resize({ width: v.width, withoutEnlargement: true });
    const out = await (v.format === "jpeg"
      ? pipeline.jpeg({ quality: v.quality, mozjpeg: true })
      : pipeline.webp({ quality: v.quality })
    ).toBuffer();
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(renditionKey(v, sourceKey), out, {
      contentType: v.format === "jpeg" ? "image/jpeg" : "image/webp",
      upsert: true,
    });
    if (upErr) throw new Error(`upload(${v.key}): ${upErr.message}`);
  }
  return "done";
}

async function worker() {
  while (cursor < sources.length) {
    const key = sources[cursor++];
    try {
      const r = await processOne(key);
      r === "done" ? done++ : skip++;
    } catch (e) {
      err++;
      errors.push(`${key}: ${e.message}`);
    }
    const total = done + skip + err;
    if (total % 100 === 0) console.log(`progress ${total}/${sources.length} done=${done} skip=${skip} err=${err}`);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`FINISHED done=${done} skip=${skip} err=${err}`);
for (const e of errors.slice(0, 10)) console.log(" -", e);
