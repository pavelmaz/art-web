#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const locales = ["fr", "de", "it", "ko", "ru", "zh"];

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
  if (!fs.existsSync(base)) continue;
  for (const file of walk(base)) {
    let c = fs.readFileSync(file, "utf8");
    const rel = path.relative(base, file);

    c = c.replace(
      /import \{ buildArtworkLanguageAlternates, artworkDetailPath \} from "@\/lib\/locale-routes";\nimport type \{ Metadata \} from "next";\nimport \{\n  artworkDetailPath,\n  buildArtworkLanguageAlternates,\n\} from "@\/lib\/locale-routes";\n/g,
      'import type { Metadata } from "next";\nimport { artworkDetailPath, buildArtworkLanguageAlternates } from "@/lib/locale-routes";\n'
    );

    if (rel.includes("[slug]/page.tsx") && rel.includes("artist")) {
      c = c.replace(
        /languages: buildHomeLanguageAlternates\(\)/g,
        "languages: buildArtistLanguageAlternates(slug)"
      );
      if (c.includes("buildArtistLanguageAlternates") && !c.includes("buildArtistLanguageAlternates }")) {
        if (!c.includes("buildArtistLanguageAlternates")) {
          /* noop */
        }
      }
      if (c.includes("buildArtistLanguageAlternates(slug)") && !c.match(/import.*buildArtistLanguageAlternates/)) {
        c = c.replace(
          /^import type \{ Metadata \}/m,
          'import { artistDetailPath, buildArtistLanguageAlternates } from "@/lib/locale-routes";\nimport type { Metadata }'
        );
      }
      c = c.replace(
        /canonical: absoluteUrl\(`\/[^`]+`\)/,
        `canonical: absoluteUrl(artistDetailPath("${loc}", slug))`
      );
      c = c.replace(/buildHomeLanguageAlternates/g, "buildArtistLanguageAlternates");
      if (c.includes("buildArtistLanguageAlternates(slug)") && c.includes("buildArtistLanguageAlternates } from")) {
        /* ok */
      } else if (c.includes("buildArtistLanguageAlternates")) {
        c = c.replace(
          /import \{ artistDetailPath, buildArtistLanguageAlternates \}/,
          "import { artistDetailPath, buildArtistLanguageAlternates }"
        );
        if (!c.includes('from "@/lib/locale-routes"')) {
          c = c.replace(
            /^import type \{ Metadata \}/m,
            'import { artistDetailPath, buildArtistLanguageAlternates } from "@/lib/locale-routes";\nimport type { Metadata }'
          );
        }
      }
    }

    if (rel === "page.tsx") {
      if (c.includes("buildHomeLanguageAlternates()") && !c.includes('from "@/lib/locale-routes"')) {
        c = c.replace(
          /^import type \{ Metadata \}/m,
          'import { buildHomeLanguageAlternates } from "@/lib/locale-routes";\nimport type { Metadata }'
        );
      }
    }

    const hubMap = [
      ["obras", "artworks"],
      ["œuvres", "artworks"],
      ["werke", "artworks"],
      ["opere", "artworks"],
      ["작품", "artworks"],
      ["произведения", "artworks"],
      ["作品", "artworks"],
      ["artistas", "artists"],
      ["artistes", "artists"],
      ["künstler", "artists"],
      ["artisti", "artists"],
      ["예술가", "artists"],
      ["художники", "artists"],
      ["艺术家", "artists"],
      ["museos", "museums"],
      ["musées", "museums"],
      ["museen", "museums"],
      ["musei", "museums"],
      ["박물관", "museums"],
      ["музеи", "museums"],
      ["博物馆", "museums"],
      ["generos", "genres"],
      ["generi", "genres"],
      ["genres", "genres"],
      ["장르", "genres"],
      ["жанры", "genres"],
      ["流派", "genres"],
      ["estilos", "styles"],
      ["stile", "styles"],
      ["stili", "styles"],
      ["스타일", "styles"],
      ["стили", "styles"],
      ["风格", "styles"],
      ["styles", "styles"],
    ];

    for (const [seg, hub] of hubMap) {
      if (rel === `${seg}/page.tsx` || rel === `${seg}/[slug]/page.tsx`) {
        if (c.includes("buildHomeLanguageAlternates()")) {
          c = c.replace(/buildHomeLanguageAlternates\(\)/g, `buildHubLanguageAlternates("${hub}")`);
          if (!c.includes("buildHubLanguageAlternates")) {
            c = c.replace(
              /^import type \{ Metadata \}/m,
              'import { buildHubLanguageAlternates, localePath } from "@/lib/locale-routes";\nimport type { Metadata }'
            );
          }
        }
      }
    }

    fs.writeFileSync(file, c);
  }
}

console.log("Fixed generated locale pages.");
