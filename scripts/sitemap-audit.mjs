/**
 * Fetches sitemaps from a running site and samples URLs for HTTP status.
 * Usage: node scripts/sitemap-audit.mjs [baseUrl]
 */
const base = (process.argv[2] || "https://fineartfree.com").replace(/\/$/, "");

async function fetchText(url) {
  const res = await fetch(url, { redirect: "manual" });
  return { status: res.status, text: res.status === 200 ? await res.text() : "" };
}

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

function extractImageLocs(xml) {
  return [...xml.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map((m) => m[1]);
}

async function checkUrl(url) {
  try {
    const res = await fetch(url, { redirect: "manual" });
    const loc = res.headers.get("location");
    let canonical = "";
    if (res.status === 200) {
      const html = await res.text();
      const m = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i);
      canonical = m?.[1] || "";
    }
    return { url, status: res.status, redirect: loc || "", canonical };
  } catch (e) {
    return { url, status: "ERR", redirect: "", canonical: String(e) };
  }
}

async function sampleUrls(urls, n = 5) {
  if (!urls.length) return [];
  const picks = [];
  const step = Math.max(1, Math.floor(urls.length / n));
  for (let i = 0; i < urls.length && picks.length < n; i += step) {
    picks.push(urls[i]);
  }
  return Promise.all(picks.map(checkUrl));
}

console.log(`Sitemap audit base: ${base}\n`);

const indexRes = await fetchText(`${base}/sitemap.xml`);
console.log(`sitemap.xml -> HTTP ${indexRes.status}`);
const childSitemaps = extractLocs(indexRes.text);
console.log(`Child sitemaps: ${childSitemaps.length}\n`);

const counts = [];
const fetchResults = [];

for (const sm of childSitemaps.slice(0, 30)) {
  const { status, text } = await fetchText(sm);
  const urls = extractLocs(text);
  const images = extractImageLocs(text);
  counts.push({ sitemap: sm.replace(base, ""), status, urlCount: urls.length, imageCount: images.length });

  if (urls.length) {
    const pattern = sm.includes("/artworks/")
      ? "artwork-page"
      : sm.includes("/images/")
        ? "image-page"
        : sm.includes("/static")
          ? "static"
          : sm.match(/\/sitemap\/(es|pt|ja|fr|de|it|ko|ru|zh)$/)
            ? "locale-hub"
            : "other";
    const samples = await sampleUrls(urls, 3);
    for (const r of samples) {
      fetchResults.push({ pattern, sitemap: sm.replace(base, ""), ...r });
    }
    if (images.length) {
      const imgSamples = images.slice(0, 3);
      for (const img of imgSamples) {
        const ir = await checkUrl(img);
        fetchResults.push({
          pattern: "image:loc",
          sitemap: sm.replace(base, ""),
          url: img,
          status: ir.status,
          redirect: ir.redirect,
          canonical: ir.canonical,
          absolute: /^https?:\/\//.test(img),
        });
      }
    }
  }
}

console.log("--- Sitemap URL counts (first 30 children) ---");
for (const c of counts) {
  console.log(`${c.sitemap} | HTTP ${c.status} | urls=${c.urlCount} images=${c.imageCount}`);
}

console.log("\n--- Blog URLs in /sitemap/static ---");
const staticRes = await fetchText(`${base}/sitemap/static`);
const staticUrls = extractLocs(staticRes.text);
const blogUrls = staticUrls.filter((u) => u.includes("/blog"));
console.log(`Total static URLs: ${staticUrls.length}`);
console.log(`Blog URLs (${blogUrls.length}):`);
for (const u of blogUrls) console.log(`  ${u.replace(base, "")}`);

console.log("\n--- Sample fetch results ---");
for (const r of fetchResults) {
  const canonNote =
    r.canonical && r.url && r.canonical !== r.url && !r.url.includes(".jpg")
      ? ` canonical≠self (${r.canonical})`
      : "";
  console.log(
    `${r.pattern} | ${String(r.url).replace(base, "")} -> HTTP ${r.status}${r.redirect ? ` -> ${r.redirect}` : ""}${canonNote}${r.absolute === false ? " RELATIVE!" : ""}`
  );
}

if (childSitemaps.length > 30) {
  console.log(`\n(... ${childSitemaps.length - 30} more child sitemaps not individually counted)`);
}
const totalChildren = childSitemaps.length;
console.log(`\nTotal child sitemaps in index: ${totalChildren}`);
