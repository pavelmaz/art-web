#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const locales = ["fr", "de", "it", "ko", "ru", "zh"];

const symbols = [
  "buildHubLanguageAlternates",
  "buildHomeLanguageAlternates",
  "buildArtworkLanguageAlternates",
  "buildArtistLanguageAlternates",
  "artworkDetailPath",
  "artistDetailPath",
  "localePath",
];

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name === "page.tsx") files.push(p);
  }
  return files;
}

for (const loc of locales) {
  const base = path.join(root, "app", loc);
  for (const file of walk(base)) {
    let c = fs.readFileSync(file, "utf8");
    const used = symbols.filter((s) => c.includes(s));
    if (!used.length) continue;
    if (c.includes('from "@/lib/locale-routes"')) {
      const m = c.match(/import \{([^}]+)\} from "@\/lib\/locale-routes"/);
      if (m) {
        const existing = m[1].split(",").map((x) => x.trim());
        const merged = [...new Set([...existing, ...used])].join(", ");
        c = c.replace(m[0], `import { ${merged} } from "@/lib/locale-routes"`);
      }
    } else {
      const imp = `import { ${used.join(", ")} } from "@/lib/locale-routes";\n`;
      c = c.replace(/^import /m, imp + "import ");
    }
    fs.writeFileSync(file, c);
  }
}

console.log("Added locale-routes imports.");
