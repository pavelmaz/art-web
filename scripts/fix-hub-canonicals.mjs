#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const CONFIG = {
  fr: {
    folders: {
      oeuvres: "artworks",
      artistes: "artists",
      museums: "museums",
      genres: "genres",
      styles: "styles",
      recherche: "search",
    },
  },
  de: {
    folders: {
      werke: "artworks",
      kunstler: "artists",
      museen: "museums",
      genres: "genres",
      stile: "styles",
      suche: "search",
    },
  },
  it: {
    folders: {
      opere: "artworks",
      artisti: "artists",
      musei: "museums",
      generi: "genres",
      stili: "styles",
      ricerca: "search",
    },
  },
  ko: {
    folders: {
      artworks: "artworks",
      artists: "artists",
      museums: "museums",
      genres: "genres",
      styles: "styles",
      search: "search",
    },
  },
  ru: {
    folders: {
      artworks: "artworks",
      artists: "artists",
      museums: "museums",
      genres: "genres",
      styles: "styles",
      search: "search",
    },
  },
  zh: {
    folders: {
      artworks: "artworks",
      artists: "artists",
      museums: "museums",
      genres: "genres",
      styles: "styles",
      search: "search",
    },
  },
};

function ensureImports(c, needs) {
  const needList = [...needs];
  const m = c.match(/import \{([^}]+)\} from "@\/lib\/locale-routes";/);
  if (m) {
    const parts = m[1].split(",").map((s) => s.trim()).filter(Boolean);
    for (const n of needList) {
      if (!parts.includes(n)) parts.push(n);
    }
    c = c.replace(m[0], `import { ${parts.join(", ")} } from "@/lib/locale-routes";`);
    return c;
  }
  return `import { ${needList.join(", ")} } from "@/lib/locale-routes";\n${c}`;
}

for (const [loc, { folders }] of Object.entries(CONFIG)) {
  for (const [folder, hub] of Object.entries(folders)) {
    const listFile = path.join(root, "app", loc, folder, "page.tsx");
    if (fs.existsSync(listFile)) {
      let c = fs.readFileSync(listFile, "utf8");
      if (c.includes("canonical: absoluteUrl(")) {
        c = ensureImports(c, ["canonicalHubUrl"]);
        c = c.replace(/canonical: absoluteUrl\([^)]+\),?/g, `canonical: canonicalHubUrl("${loc}", "${hub}"),`);
        fs.writeFileSync(listFile, c);
        console.log("list", listFile);
      }
    }

    const slugFile = path.join(root, "app", loc, folder, "[slug]", "page.tsx");
    if (fs.existsSync(slugFile)) {
      let c = fs.readFileSync(slugFile, "utf8");
      if (c.includes("canonical: absoluteUrl(")) {
        c = ensureImports(c, ["localePath"]);
        const slugVar = c.includes("${linkSlug}") ? "linkSlug" : "slug";
        c = c.replace(
          /canonical: absoluteUrl\([^)]+\),?/g,
          `canonical: \`https://fineartfree.com\${localePath("${loc}", "${hub}")}/\${${slugVar}}\`,`
        );
        fs.writeFileSync(slugFile, c);
        console.log("slug", slugFile);
      }
    }
  }
}

console.log("Done");
