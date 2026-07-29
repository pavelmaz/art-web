/**
 * Wikipedia / Wikimedia Commons artwork importer.
 *
 * Accepts any mix of:
 *   - Wikipedia media-viewer URLs:  https://es.wikipedia.org/wiki/Foo#/media/Archivo:Bar.jpg
 *   - Commons file titles:          "File:Rafael - Retrato de um Cardeal.jpg"
 *   - Commons categories:           "Category:Paintings by Raphael"   (bulk)
 *
 * For each file it queries the Commons API (no HTML scraping) for the original
 * file URL + structured metadata, imports ONLY public-domain/CC0 works, resolves
 * artist names against the existing artists table (alias map to avoid the
 * duplicate-artist problem), dedupes by title+artist, inserts directly into
 * Supabase (same shape as /api/import-artworks), and submits new URLs to
 * IndexNow. Images stay external until the existing migrate-external-images
 * step copies them to storage/R2 (it already sends a proper User-Agent).
 *
 * Usage:
 *   node --env-file=.env.local import-wikipedia.mjs --dry <input...>   # preview
 *   node --env-file=.env.local import-wikipedia.mjs <input...>         # import
 *   Flags: --dry  --limit=N (category cap, default 200)
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const UA = "FineArtFree-importer/1.0 (https://fineartfree.com; pavelmazuelas@gmail.com)";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const INDEXNOW_KEY = "faf-indexnow-2026-xK9mP3qR";
const MIN_WIDTH = 600;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY (.env.local)");
  process.exit(1);
}

/** Known metadata-name → canonical artists.name in OUR database. Extend as
 *  dry-runs surface new spellings (keys lowercase). */
const ARTIST_ALIASES = {
  "rafael sanzio": "Raphael",
  "raffaello sanzio": "Raphael",
  "rafael": "Raphael",
  "raphael sanzio": "Raphael",
};

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const limitArg = args.find((a) => a.startsWith("--limit="));
const CATEGORY_CAP = limitArg ? parseInt(limitArg.split("=")[1], 10) : 200;
// --drip[=N]: walk existing artists A→Z and import up to N new works (default 25),
// resuming from a saved cursor (_import_drip_state). --after=Name overrides the
// start; --max-artists=M caps how many artists one run will scan (safety).
const dripArg = args.find((a) => a.startsWith("--drip"));
const DRIP = dripArg ? (parseInt(dripArg.split("=")[1] ?? "", 10) || 25) : 0;
const afterArg = args.find((a) => a.startsWith("--after="));
const DRIP_CURSOR = afterArg ? afterArg.split("=").slice(1).join("=") : "";
const maxArtistsArg = args.find((a) => a.startsWith("--max-artists="));
const MAX_ARTISTS = maxArtistsArg ? parseInt(maxArtistsArg.split("=")[1], 10) : 150;
const inputs = args.filter((a) => !a.startsWith("--"));
if (inputs.length === 0 && !DRIP) {
  console.error("No inputs. Pass Wikipedia media URLs, File:… titles, Category:… names, or use --drip[=N].");
  process.exit(1);
}

// ---------- small helpers ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stripHtml = (s) => (s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

// Ports of makeSlug/normalizeTitle from app/api/import-artworks/route.ts
function makeSlug(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[æ]/g, "ae").replace(/[œ]/g, "oe").replace(/[ø]/g, "o")
    .replace(/[ß]/g, "ss").replace(/[đ]/g, "d").replace(/[ł]/g, "l")
    .replace(/[þ]/g, "th").replace(/[ð]/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}
function normalizeTitle(title) {
  return title
    .replace(/\(\d{4}\)/g, "")
    .replace(/\[\d{4}\]/g, "")
    .replace(/,?\s*\d{4}\.?$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function pgrest(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`PostgREST ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return text.trim() ? JSON.parse(text) : null;
}

async function commons(params) {
  const url = `${COMMONS_API}?format=json&origin=*&${new URLSearchParams(params)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Commons API ${res.status}`);
  return res.json();
}

// ---------- Wikidata: all paintings by an artist (P170), canonical image (P18) ----------
async function wikidataPaintings(artistName) {
  // Resolve the artist entity, guarded to art occupations (same idea as the
  // portrait backfill): painter/artist/printmaker/drawer/engraver/illustrator.
  const ART_OCCUPATIONS = new Set(["Q1028181", "Q483501", "Q11569986", "Q15296811", "Q329439", "Q644687"]);
  const search = await (await fetch(
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(artistName)}&language=en&type=item&limit=5&format=json&origin=*`,
    { headers: { "User-Agent": UA } }
  )).json();
  let qid = null;
  for (const hit of search?.search ?? []) {
    const ent = await (await fetch(
      `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${hit.id}&property=P106&format=json&origin=*`,
      { headers: { "User-Agent": UA } }
    )).json();
    const occs = (ent?.claims?.P106 ?? []).map((c) => c?.mainsnak?.datavalue?.value?.id);
    if (occs.some((o) => ART_OCCUPATIONS.has(o))) { qid = hit.id; break; }
    await sleep(100);
  }
  if (!qid) throw new Error(`No Wikidata artist entity found for "${artistName}"`);

  // Multilingual labels + English aliases feed the dedupe: our catalog holds
  // titles in several languages (Artvee-era French/Spanish titles etc.), so
  // "Luncheon on the Grass" must also be checked as "Le Déjeuner sur l'herbe".
  const sparql = `SELECT ?item ?itemLabel ?image ?date
    (GROUP_CONCAT(DISTINCT ?otherLabel; separator="|") AS ?altTitles) WHERE {
    ?item wdt:P170 wd:${qid}; wdt:P31 wd:Q3305213; wdt:P18 ?image.
    OPTIONAL { ?item wdt:P571 ?date. }
    OPTIONAL {
      { ?item rdfs:label ?otherLabel FILTER(LANG(?otherLabel) IN ("fr","de","es","it","nl","pt","ru")) }
      UNION
      { ?item skos:altLabel ?otherLabel FILTER(LANG(?otherLabel) = "en") }
    }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  } GROUP BY ?item ?itemLabel ?image ?date`;
  // The SPARQL endpoint 502s transiently under load — retry with backoff.
  let rows = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(
      `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`,
      { headers: { "User-Agent": UA, Accept: "application/sparql-results+json" } }
    );
    if (res.ok) { rows = (await res.json())?.results?.bindings ?? []; break; }
    console.error(`  SPARQL ${res.status} for ${artistName}, attempt ${attempt}`);
    await sleep(8000 * attempt);
  }
  if (rows === null) throw new Error(`Wikidata SPARQL failed after retries`);
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const fileName = decodeURIComponent(r.image.value.split("/Special:FilePath/").pop() || "").replace(/_/g, " ");
    if (!fileName || seen.has(fileName)) continue;
    seen.add(fileName);
    const label = r.itemLabel?.value ?? "";
    out.push({
      file: `File:${fileName}`,
      // Skip Q-id labels (unnamed items) — fall back to Commons metadata then.
      titleOverride: /^Q\d+$/.test(label) ? null : label,
      year: r.date?.value ? new Date(r.date.value).getUTCFullYear() : null,
      altTitles: (r.altTitles?.value ?? "").split("|").filter(Boolean),
    });
  }
  console.log(`Wikidata ${artistName} (${qid}): ${out.length} paintings with images`);
  return out;
}

// ---------- input parsing ----------
/** Localized File namespaces seen in wiki media URLs. */
const FILE_NS = "(?:File|Archivo|Fichier|Datei|Ficheiro|Immagine|Файл|ファイル|Bestand)";

function toFileTitles(input) {
  // Category
  if (/^category:/i.test(input)) return { category: input };
  // Bare File: title (any localized prefix)
  const bare = input.match(new RegExp(`^${FILE_NS}:(.+)$`, "i"));
  if (bare) return { file: `File:${bare[1]}` };
  // URL with #/media/<NS>:<name>
  try {
    const decoded = decodeURIComponent(input);
    const m = decoded.match(new RegExp(`#/media/${FILE_NS}:(.+)$`, "i"));
    if (m) return { file: `File:${m[1].replace(/_/g, " ")}` };
  } catch {}
  return { error: `Cannot parse input: ${input}` };
}

async function expandCategory(cat) {
  const files = [];
  let cmcontinue;
  while (files.length < CATEGORY_CAP) {
    const data = await commons({
      action: "query",
      list: "categorymembers",
      cmtitle: cat,
      cmtype: "file",
      cmlimit: "100",
      ...(cmcontinue ? { cmcontinue } : {}),
    });
    for (const m of data?.query?.categorymembers ?? []) files.push(m.title);
    cmcontinue = data?.continue?.cmcontinue;
    if (!cmcontinue) break;
    await sleep(150);
  }
  return files.slice(0, CATEGORY_CAP);
}

// ---------- metadata ----------
async function fileInfo(fileTitle) {
  const data = await commons({
    action: "query",
    titles: fileTitle,
    prop: "imageinfo",
    iiprop: "url|size|extmetadata",
    // Thumb URL for formats browsers can't render (TIFF) — see imageUrl below.
    iiurlwidth: "1920",
  });
  const pages = data?.query?.pages ?? {};
  const page = Object.values(pages)[0];
  const ii = page?.imageinfo?.[0];
  if (!ii) return { skip: `no imageinfo (${fileTitle})` };

  const meta = ii.extmetadata ?? {};
  const license = stripHtml(meta.LicenseShortName?.value || meta.License?.value || "");
  if (!/public domain|^pd\b|pd-|cc0/i.test(license)) {
    return { skip: `license not PD/CC0: "${license || "unknown"}" (${fileTitle})` };
  }
  if ((ii.width ?? 0) < MIN_WIDTH) {
    return { skip: `too small: ${ii.width}px wide (${fileTitle})` };
  }

  const artistRaw = stripHtml(meta.Artist?.value || "");
  let title = stripHtml(meta.ObjectName?.value || "");
  if (!title) {
    // Fall back to the filename: drop extension/underscores and a leading "Artist -" prefix.
    title = fileTitle
      .replace(/^File:/i, "")
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/_/g, " ")
      .trim();
    if (artistRaw) {
      const prefix = new RegExp(`^${artistRaw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[-–—]\\s*`, "i");
      title = title.replace(prefix, "");
    }
  }
  // Browsers can't render TIFF: use the Commons JPEG thumb instead of the
  // original file URL (e.g. Nationalmuseum uploads whole scans as .tif).
  const isTiff = /\.tiff?$/i.test(ii.url ?? "");
  const imageUrl = isTiff && ii.thumburl && /\.jpe?g$/i.test(ii.thumburl) ? ii.thumburl : ii.url;
  if (/\.tiff?$/i.test(imageUrl ?? "")) {
    return { skip: `tiff with no jpeg thumb (${fileTitle})` };
  }

  // Dims of the file we actually store: the original's — unless we fell back to
  // the JPEG thumb (TIFF case), then the thumb's.
  const usedThumb = imageUrl !== ii.url;
  return {
    title: normalizeTitle(title),
    artistRaw,
    imageUrl,
    pageUrl: ii.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(fileTitle)}`,
    width: usedThumb ? ii.thumbwidth : ii.width,
    height: usedThumb ? ii.thumbheight : ii.height,
    license,
  };
}

/** Aggressively normalized title for duplicate detection: lowercase, accents/
 *  punctuation stripped, articles and St/Saint dropped, tokens SORTED so word
 *  order doesn't matter. Catches "The Hunters in the Snow" vs "Hunters in the
 *  Snow", "Self-portrait" vs "Self Portrait", curly vs straight apostrophes,
 *  "Philip IV, King of Spain" vs "King Philip IV of Spain". */
function normTitleKey(t) {
  return (t || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[’'`´]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((w) => w && !["the", "a", "an", "st", "saint"].includes(w))
    .sort()
    .join(" ");
}

/** Cached normalized-title sets per artist, so dedupe is one DB fetch per artist. */
const artistTitleKeys = new Map();
async function titleKeysFor(artist) {
  if (!artistTitleKeys.has(artist)) {
    const rows = await pgrest(
      `artworks?select=title&artist_display=eq.${encodeURIComponent(artist)}&limit=5000`
    );
    artistTitleKeys.set(artist, new Set(rows.map((r) => normTitleKey(r.title))));
  }
  return artistTitleKeys.get(artist);
}

async function resolveArtist(artistRaw) {
  if (!artistRaw) return { canonical: null, isNew: false };
  const aliased = ARTIST_ALIASES[artistRaw.toLowerCase()] ?? artistRaw;
  const rows = await pgrest(`artists?select=name&name=ilike.${encodeURIComponent(aliased)}&limit=1`);
  if (rows.length) return { canonical: rows[0].name, isNew: false };
  return { canonical: aliased, isNew: true };
}

// ---------- per-item processing ----------
const summary = { imported: 0, skipped: 0, newArtists: new Set(), touchedArtists: new Set() };
const newSlugs = [];

/** Process one work item {file, titleOverride?, year?, altTitles?, artistHint?}.
 *  Returns "import" if it imported it (or WOULD, in --dry), else "skip".
 *  Mutates summary/newSlugs as a side effect. */
async function processItem(item) {
  const fileTitle = item.file;
  await sleep(150);
  try {
    const info = await fileInfo(fileTitle);
    if (info.skip) { console.log(`— SKIP  ${info.skip}`); summary.skipped++; return "skip"; }
    if (item.titleOverride) info.title = normalizeTitle(item.titleOverride);
    if (item.artistHint) info.artistRaw = item.artistHint;
    if (!info.title || !info.artistRaw) {
      console.log(`— SKIP  missing title/artist (${fileTitle})`);
      summary.skipped++; return "skip";
    }
    // Items with no English title leak raw multilingual QS markup ("title QS:P1476,nl:…")
    // through Commons ObjectName — garbage titles/slugs, not worth importing.
    if (/QS:/i.test(info.title)) {
      console.log(`— SKIP  no clean English title (${fileTitle})`);
      summary.skipped++; return "skip";
    }

    const { canonical, isNew } = await resolveArtist(info.artistRaw);
    if (isNew) summary.newArtists.add(canonical);

    // Dedupe: normalized order-insensitive title key against everything the
    // artist already has (catches article/hyphen/apostrophe/word-order variants).
    // The Wikidata item's OTHER-LANGUAGE labels and English aliases are checked
    // too, so a French-titled Artvee copy blocks the English wiki import.
    const seenKeys = await titleKeysFor(canonical);
    const key = normTitleKey(info.title);
    const allKeys = [key, ...(item.altTitles ?? []).map(normTitleKey)].filter(Boolean);
    const hit = allKeys.find((k) => seenKeys.has(k));
    if (hit) {
      console.log(`— SKIP  already in catalog${hit !== key ? " (matched alt-language title)" : ""}: "${info.title}" — ${canonical}`);
      summary.skipped++; return "skip";
    }

    console.log(
      `${DRY ? "→ WOULD IMPORT" : "+ IMPORT"}  "${info.title}" — ${canonical}${isNew ? " (NEW ARTIST)" : ""}  [${info.width}×${info.height}, ${info.license}]`
    );
    if (DRY) return "import"; // count would-imports toward the drip cap

    if (isNew) {
      await pgrest("artists", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates" },
        body: JSON.stringify({ name: canonical, slug: makeSlug(canonical) }),
      }).catch(() => {});
    }

    // Unique slug
    const slugBase = makeSlug(`${info.title} ${canonical}`);
    let slug = slugBase;
    let counter = 1;
    while ((await pgrest(`artworks?select=id&slug=eq.${encodeURIComponent(slug)}&limit=1`)).length) {
      slug = `${slugBase}-${counter++}`;
    }

    await pgrest("artworks", {
      method: "POST",
      body: JSON.stringify({
        id: slug,
        slug,
        title: info.title,
        artist_display: canonical,
        image_id: info.imageUrl,
        url: info.pageUrl,
        score: 50,
        ...(item.year ? { date_display: String(item.year) } : {}),
        // Commons reports the original's dimensions — write them at insert time so
        // the download rows can show real specs (they were NULL until the nightly
        // renditions job backfilled them).
        ...(info.width ? { img_width: info.width, img_height: info.height } : {}),
      }),
    });
    summary.imported++;
    summary.touchedArtists.add(canonical);
    seenKeys.add(key);
    newSlugs.push(slug);
    return "import";
  } catch (err) {
    console.error(`✗ ERROR ${fileTitle}: ${err.message}`);
    summary.skipped++; return "skip";
  }
}

// ---------- main ----------
if (DRIP) {
  // Drip mode: walk existing artists alphabetically from the saved cursor,
  // import each one's new Wikidata paintings, and STOP once DRIP works are
  // imported (or MAX_ARTISTS scanned). Drains a prolific artist across days:
  // the cursor only advances past an artist once ALL their works are checked.
  let cursor = DRIP_CURSOR;
  if (!cursor && !DRY) {
    const st = await pgrest(`_import_drip_state?select=cursor&id=eq.1&limit=1`).catch(() => null);
    if (st && st[0]?.cursor) cursor = st[0].cursor;
  }
  console.log(`\n${DRY ? "DRY RUN — " : ""}DRIP: up to ${DRIP} new works, starting after artist "${cursor}"\n`);

  let imported = 0, scanned = 0, lastCompleted = cursor, pageCursor = cursor;
  outer:
  while (imported < DRIP && scanned < MAX_ARTISTS) {
    const filter = pageCursor ? `&name=gt.${encodeURIComponent(pageCursor)}` : "";
    const batch = await pgrest(`artists?select=name&order=name.asc${filter}&limit=25`);
    if (!batch || !batch.length) { console.log("Reached the end of the artist list."); break; }
    for (const { name } of batch) {
      if (imported >= DRIP || scanned >= MAX_ARTISTS) break outer;
      scanned++;
      pageCursor = name;
      let paintings = [];
      try { paintings = await wikidataPaintings(name); }
      catch (e) { console.error(`✗ ${name}: ${e.message}`); lastCompleted = name; continue; }
      let capMidArtist = false;
      for (const p of paintings) {
        if (imported >= DRIP) { capMidArtist = true; break; }
        if ((await processItem({ ...p, artistHint: name })) === "import") imported++;
      }
      if (capMidArtist) break outer; // leave cursor at the last FULLY-drained artist
      lastCompleted = name;
    }
  }
  console.log(`\n${DRY ? "DRY " : ""}DRIP result: ${imported} ${DRY ? "would import" : "imported"} · scanned ${scanned} artist(s) · next run resumes after "${lastCompleted}"`);
  if (!DRY) {
    await pgrest(`_import_drip_state?on_conflict=id`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ id: 1, cursor: lastCompleted }),
    }).catch((e) => console.error("cursor save failed:", e.message));
  }

  // Automation step: ensure every artist we touched has a portrait; find one via
  // Wikidata (P18) if it's missing. backfill-artist-portraits only ever touches
  // artists whose image_url is null, so artists that already have one are skipped.
  const toPortrait = [...new Set([...summary.touchedArtists, ...summary.newArtists])];
  if (!DRY && toPortrait.length) {
    console.log(`\nArtist portraits: checking ${toPortrait.length} artist(s) for a missing image…`);
    try {
      const { execFileSync } = await import("node:child_process");
      execFileSync(process.execPath, ["backfill-artist-portraits.mjs"], {
        stdio: "inherit",
        env: { ...process.env, NAMES: toPortrait.join("|") },
      });
    } catch (e) { console.error("portrait step failed:", e.message); }
  }
} else {
  // Input mode: Wikipedia media URLs / File:… / Category:… / wd:Artist Name
  const fileTitles = [];
  for (const input of inputs) {
    if (/^wd:/i.test(input)) {
      const artistName = input.slice(3).trim();
      try {
        const paintings = await wikidataPaintings(artistName);
        fileTitles.push(...paintings.map((p) => ({ ...p, artistHint: artistName })));
      } catch (e) {
        console.error(`✗ SKIPPING ARTIST ${artistName}: ${e.message}`);
      }
      continue;
    }
    const parsed = toFileTitles(input);
    if (parsed.error) { console.error(`✗ ${parsed.error}`); continue; }
    if (parsed.category) {
      const files = await expandCategory(parsed.category);
      console.log(`Category ${parsed.category}: ${files.length} files`);
      fileTitles.push(...files.map((f) => ({ file: f })));
    } else {
      fileTitles.push({ file: parsed.file });
    }
  }
  console.log(`\n${DRY ? "DRY RUN — " : ""}processing ${fileTitles.length} file(s)…\n`);
  for (const item of fileTitles) await processItem(item);
}

// artwork_count refresh for touched artists
for (const name of summary.touchedArtists) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/artworks?select=id&artist_display=eq.${encodeURIComponent(name)}`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: "count=exact", Range: "0-0" } }
  );
  const count = parseInt(res.headers.get("content-range")?.split("/")[1] ?? "0", 10);
  await pgrest(`artists?slug=eq.${encodeURIComponent(makeSlug(name))}`, {
    method: "PATCH",
    body: JSON.stringify({ artwork_count: count }),
  });
}

// IndexNow for the new pages (all 10 locales)
if (newSlugs.length) {
  const LOCALES = [
    { p: "", seg: "artworks" }, { p: "/es", seg: "obras" }, { p: "/pt", seg: "obras" },
    ...["de", "fr", "it", "ja", "ko", "ru", "zh"].map((l) => ({ p: `/${l}`, seg: "artworks" })),
  ];
  const urls = newSlugs.flatMap((s) =>
    LOCALES.map(({ p, seg }) => `https://fineartfree.com${p}/${seg}/${encodeURIComponent(s)}`)
  );
  await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      host: "fineartfree.com",
      key: INDEXNOW_KEY,
      keyLocation: `https://fineartfree.com/${INDEXNOW_KEY}.txt`,
      urlList: urls,
    }),
  }).catch(() => {});
  console.log(`\nIndexNow: submitted ${urls.length} URLs for ${newSlugs.length} new artwork(s).`);
}

console.log(`\nDone. Imported: ${summary.imported}, skipped: ${summary.skipped}.`);
if (summary.newArtists.size) {
  console.log(`New artists${DRY ? " that would be created" : " created"}: ${[...summary.newArtists].join(", ")}`);
  console.log("→ If any of these are alternate spellings of existing artists, add them to ARTIST_ALIASES and re-run.");
}
if (!DRY && newSlugs.length) {
  console.log("\nNote: images are still external (Wikimedia). Run after-scrape.sh (or the");
  console.log("migrate-external-images function) to copy them into storage/R2.");
}
