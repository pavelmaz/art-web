// Backfill artist portraits from Wikimedia Commons (via Wikidata P18).
//
// For each artist with a null image_url: find their Wikidata entity (must be a
// human WITH an art occupation, to avoid same-name false positives), take the
// P18 portrait, download the Commons thumbnail, upload it into Supabase Storage
// under artists/<sha256>.<ext>, and set artists.image_url to the public URL
// (stored as the supabase.co URL — the app rewrites it to the CDN at render).
//
// Idempotent + resumable: only ever touches artists whose image_url is null.
//   node backfill-artist-portraits.mjs [limit]      run (default: all)
//   DRY=1 node backfill-artist-portraits.mjs 20      resolve only, no writes
//
// Safe to run alongside the enrichment loop (different columns).
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const LIMIT = Number(process.argv[2] || 100000);
const DRY = process.env.DRY === "1";
const UA = "fineartfree-portrait-bot/1.0 (https://fineartfree.com; pavel@fineartfree.com)";
const WD = "https://www.wikidata.org/w/api.php";

// Wikidata occupations (P106) that qualify someone as a visual artist. Requiring
// one of these (plus P31=Q5 human + a P18 image) guards against same-name matches.
const ART_OCCUPATIONS = new Set([
  "Q1028181", // painter
  "Q483501",  // artist
  "Q3391743", // visual artist
  "Q11569986",// printmaker
  "Q329439",  // engraver
  "Q15296811",// draughtsperson
  "Q644687",  // illustrator
  "Q1281618", // sculptor
  "Q33231",   // photographer
  "Q1925963", // graphic artist
  "Q42973",   // architect (some catalog "artists" are architects/draughtsmen)
  "Q1114448", // cartoonist
]);

function env(key) {
  const line = readFileSync(".env.local", "utf8")
    .split("\n")
    .find((l) => l.replace(/^export\s+/, "").startsWith(`${key}=`));
  if (!line) throw new Error(`missing ${key} in .env.local`);
  return line.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");
}

const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
const KEY = env("SUPABASE_SERVICE_KEY");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wd(params) {
  const url = `${WD}?${new URLSearchParams({ ...params, format: "json", origin: "*" })}`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`wikidata ${res.status}`);
  return res.json();
}

async function resolvePortrait(name) {
  const search = await wd({
    action: "wbsearchentities", search: name, language: "en", type: "item", limit: "6",
  });
  const ids = (search.search ?? []).map((s) => s.id);
  if (!ids.length) return null;

  const ent = await wd({
    action: "wbgetentities", ids: ids.join("|"), props: "claims", languages: "en",
  });

  for (const id of ids) {
    const claims = ent.entities?.[id]?.claims;
    if (!claims) continue;
    const isHuman = (claims.P31 ?? []).some((c) => c.mainsnak?.datavalue?.value?.id === "Q5");
    const isArtist = (claims.P106 ?? []).some((c) =>
      ART_OCCUPATIONS.has(c.mainsnak?.datavalue?.value?.id),
    );
    const p18 = claims.P18?.[0]?.mainsnak?.datavalue?.value;
    if (isHuman && isArtist && p18) {
      const file = String(p18).replace(/ /g, "_");
      return {
        id,
        file: p18,
        url: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=800`,
      };
    }
  }
  return null;
}

const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

async function download(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const type = (res.headers.get("content-type") || "").split(";")[0].trim();
  const buf = Buffer.from(await res.arrayBuffer());
  return { buf, type, ext: EXT[type] || "jpg" };
}

async function upload(path, buf, type) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": type || "image/jpeg",
      "x-upsert": "true",
    },
    body: buf,
  });
  if (!res.ok) throw new Error(`upload ${res.status} ${await res.text()}`);
}

async function setImageUrl(slug, publicUrl) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/artists?slug=eq.${encodeURIComponent(slug)}`,
    {
      method: "PATCH",
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ image_url: publicUrl }),
    },
  );
  if (!res.ok) throw new Error(`patch ${res.status} ${await res.text()}`);
}

async function listArtists() {
  // NAMES="A|B|C" → retry just those artists (still-null only), ignoring the row cap.
  if (process.env.NAMES) {
    const inList = "(" + process.env.NAMES.split("|").map((n) => `"${n}"`).join(",") + ")";
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/artists?select=slug,name,artwork_count&image_url=is.null&name=in.${encodeURIComponent(inList)}`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } },
    );
    if (!res.ok) throw new Error(`list ${res.status}`);
    return res.json();
  }

  const qs = new URLSearchParams({
    select: "slug,name,artwork_count",
    image_url: "is.null",
    name: "not.ilike.http%",
    order: "artwork_count.desc.nullslast",
    limit: String(LIMIT),
  });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/artists?${qs}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`list ${res.status}`);
  const rows = await res.json();
  const SKIP = /\b(unknown|unidentified|anonymous|after|follower of|circle of|manner of|attributed)\b/i;
  return rows.filter((r) => r.name && !SKIP.test(r.name));
}

const artists = await listArtists();
console.log(`Candidates: ${artists.length}  (DRY=${DRY ? "yes" : "no"}, limit=${LIMIT})\n`);

let filled = 0, noWiki = 0, errors = 0;
for (const [i, a] of artists.entries()) {
  const tag = `[${i + 1}/${artists.length}] ${a.name}`;
  try {
    const hit = await resolvePortrait(a.name);
    if (!hit) { noWiki++; console.log(`—  ${tag} (no wiki portrait)`); await sleep(200); continue; }

    if (DRY) { filled++; console.log(`✅ ${tag} → ${hit.url}`); await sleep(200); continue; }

    const { buf, type, ext } = await download(hit.url);
    const hash = createHash("sha256").update(buf).digest("hex");
    const path = `art-images/artists/${hash}.${ext}`;
    await upload(path, buf, type);
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${path}`;
    await setImageUrl(a.slug, publicUrl);
    filled++;
    console.log(`✅ ${tag} → ${hash.slice(0, 12)}.${ext} (${(buf.length / 1024).toFixed(0)} KB)`);
  } catch (err) {
    errors++;
    console.log(`✗  ${tag} — ${err.message}`);
  }
  await sleep(250);
}

console.log(`\nDone. filled=${filled}  noWiki=${noWiki}  errors=${errors}  of ${artists.length}`);
