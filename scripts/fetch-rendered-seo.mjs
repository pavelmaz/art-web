const base = process.argv[2] || "https://fineartfree.com";

const paths = [
  "/artworks/south-wind-clear-weather",
  "/es/obras/south-wind-clear-weather",
  "/ja/artworks/south-wind-clear-weather",
  "/artists",
  "/ja/artists",
  "/blog/edvard-munch-paintings",
];

for (const path of paths) {
  const url = `${base}${path}`;
  console.log("=".repeat(60));
  console.log(path);
  const res = await fetch(url, { redirect: "manual" });
  console.log(`HTTP ${res.status}`);
  const link = res.headers.get("link");
  console.log("\n--- Link header ---");
  console.log(link || "(none)");
  if (res.status === 200) {
    const html = await res.text();
    console.log("\n--- canonical ---");
    const canon = html.match(/<link[^>]+rel="canonical"[^>]*>/gi) || [];
    canon.forEach((t) => console.log(t));
    console.log("\n--- hreflang ---");
    const alts = html.match(/<link[^>]+rel="alternate"[^>]+hreflang="[^"]+"[^>]*>/gi) || [];
    alts.sort().forEach((t) => console.log(t));
  }
  console.log("");
}
