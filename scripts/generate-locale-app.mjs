#!/usr/bin/env node
/**
 * Generate app/{locale}/ from app/es/ templates (subset without temas/paises).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const esDir = path.join(root, "app", "es");

const LOCALES = {
  fr: {
    fromEs: {
      "/es": "/fr",
      obras: "œuvres",
      artistas: "artistes",
      museos: "musées",
      generos: "genres",
      estilos: "styles",
      buscar: "recherche",
      description_sp: "description_fr",
      '"es"': '"fr"',
      "'es'": "'fr'",
      Es: "Fr",
      español: "français",
      esTranslation: "localeTranslation",
      '.eq("locale", "es")': '.eq("locale", "fr")',
      "Artista desconocido": "Artiste inconnu",
      "Obra no encontrada": "Œuvre introuvable",
      Inicio: "Accueil",
      Obras: "Œuvres",
      "Más arte de": "Plus d\\'art",
      Siguiente: "Suivant",
      Búsqueda: "Recherche",
      "Obras de Arte": "Œuvres d\\'art",
    },
    genreSegment: "genres",
    styleSegment: "styles",
  },
  de: {
    fromEs: {
      "/es": "/de",
      obras: "werke",
      artistas: "künstler",
      museos: "museen",
      generos: "genres",
      estilos: "stile",
      buscar: "suche",
      description_sp: "description_ger",
      '"es"': '"de"',
      "'es'": "'de'",
      Es: "De",
      esTranslation: "localeTranslation",
      '.eq("locale", "es")': '.eq("locale", "de")',
      "Artista desconocido": "Unbekannter Künstler",
      "Obra no encontrada": "Werk nicht gefunden",
      Inicio: "Start",
      Obras: "Werke",
      "Más arte de": "Mehr Kunst von",
      Siguiente: "Weiter",
      Búsqueda: "Suche",
      "Obras de Arte": "Kunstwerke",
    },
    genreSegment: "genres",
    styleSegment: "stile",
  },
  it: {
    fromEs: {
      "/es": "/it",
      obras: "opere",
      artistas: "artisti",
      museos: "musei",
      generos: "generi",
      estilos: "stili",
      buscar: "ricerca",
      description_sp: "description_it",
      '"es"': '"it"',
      "'es'": "'it'",
      Es: "It",
      esTranslation: "localeTranslation",
      '.eq("locale", "es")': '.eq("locale", "it")',
      "Artista desconocido": "Artista sconosciuto",
      "Obra no encontrada": "Opera non trovata",
      Inicio: "Home",
      Obras: "Opere",
      "Más arte de": "Più arte di",
      Siguiente: "Avanti",
      Búsqueda: "Ricerca",
      "Obras de Arte": "Opere d\\'arte",
    },
    genreSegment: "generi",
    styleSegment: "stili",
  },
  ko: {
    fromEs: {
      "/es": "/ko",
      obras: "작품",
      artistas: "예술가",
      museos: "박물관",
      generos: "장르",
      estilos: "스타일",
      buscar: "검색",
      description_sp: "description_ko",
      '"es"': '"ko"',
      "'es'": "'ko'",
      Es: "Ko",
      esTranslation: "localeTranslation",
      '.eq("locale", "es")': '.eq("locale", "ko")',
      "Artista desconocido": "알 수 없는 예술가",
      "Obra no encontrada": "작품을 찾을 수 없습니다",
      Inicio: "홈",
      Obras: "작품",
      "Más arte de": "더 많은",
      Siguiente: "다음",
      Búsqueda: "검색",
      "Obras de Arte": "작품",
    },
    genreSegment: "장르",
    styleSegment: "스타일",
  },
  ru: {
    fromEs: {
      "/es": "/ru",
      obras: "произведения",
      artistas: "художники",
      museos: "музеи",
      generos: "жанры",
      estilos: "стили",
      buscar: "поиск",
      description_sp: "description_ru",
      '"es"': '"ru"',
      "'es'": "'ru'",
      Es: "Ru",
      esTranslation: "localeTranslation",
      '.eq("locale", "es")': '.eq("locale", "ru")',
      "Artista desconocido": "Неизвестный художник",
      "Obra no encontrada": "Произведение не найдено",
      Inicio: "Главная",
      Obras: "Произведения",
      "Más arte de": "Больше искусства",
      Siguiente: "Далее",
      Búsqueda: "Поиск",
      "Obras de Arte": "Произведения",
    },
    genreSegment: "жанры",
    styleSegment: "стили",
  },
  zh: {
    fromEs: {
      "/es": "/zh",
      obras: "作品",
      artistas: "艺术家",
      museos: "博物馆",
      generos: "流派",
      estilos: "风格",
      buscar: "搜索",
      description_sp: "description_ch",
      '"es"': '"zh"',
      "'es'": "'zh'",
      Es: "Zh",
      esTranslation: "localeTranslation",
      '.eq("locale", "es")': '.eq("locale", "zh")',
      "Artista desconocido": "未知艺术家",
      "Obra no encontrada": "未找到作品",
      Inicio: "首页",
      Obras: "作品",
      "Más arte de": "更多",
      Siguiente: "下一页",
      Búsqueda: "搜索",
      "Obras de Arte": "艺术作品",
    },
    genreSegment: "流派",
    styleSegment: "风格",
  },
};

const FILE_MAP = [
  ["layout.tsx", "layout.tsx"],
  ["page.tsx", "page.tsx"],
  ["obras/page.tsx", null],
  ["obras/[slug]/page.tsx", null],
  ["artistas/page.tsx", null],
  ["artistas/[slug]/page.tsx", null],
  ["museos/page.tsx", null],
  ["museos/[slug]/page.tsx", null],
  ["generos/page.tsx", null],
  ["generos/[slug]/page.tsx", null],
  ["estilos/page.tsx", null],
  ["estilos/[slug]/page.tsx", null],
  ["buscar/page.tsx", null],
];

function applyReplacements(content, repl) {
  let out = content;
  const keys = Object.keys(repl).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    out = out.split(key).join(repl[key]);
  }
  return out;
}

function destPath(locale, esRel, cfg) {
  const r = cfg.fromEs;
  const mapSeg = (seg) => {
    if (seg === "obras") return r.obras;
    if (seg === "artistas") return r.artistas;
    if (seg === "museos") return r.museos;
    if (seg === "generos") return cfg.genreSegment;
    if (seg === "estilos") return cfg.styleSegment;
    if (seg === "buscar") return r.buscar;
    return seg;
  };
  const parts = esRel.split("/");
  const mapped = parts.map((p) => mapSeg(p));
  return path.join(root, "app", locale, ...mapped);
}

function patchContent(content, locale, cfg) {
  let out = applyReplacements(content, cfg.fromEs);
  const artworksSeg = cfg.fromEs.obras;

  if (out.includes("alternates:") && out.includes("canonical:")) {
    if (out.includes("/obras/") || out.includes(artworksSeg + "/")) {
      out = out.replace(
        /alternates:\s*\{[\s\S]*?languages:\s*\{[\s\S]*?\},?\s*\}/,
        (block) => {
          if (block.includes("buildArtworkLanguageAlternates")) return block;
          if (block.includes("[slug]") || block.includes("slug}")) {
            return `alternates: {
      canonical: \`https://fineartfree.com\${artworkDetailPath("${locale}", slug)}\`,
      languages: buildArtworkLanguageAlternates(slug),
    }`;
          }
          return block;
        }
      );
    }
  }

  const imports = [];
  if (out.includes("buildArtworkLanguageAlternates")) {
    imports.push("buildArtworkLanguageAlternates");
  }
  if (out.includes("buildHubLanguageAlternates")) {
    imports.push("buildHubLanguageAlternates");
  }
  if (out.includes("buildHomeLanguageAlternates")) {
    imports.push("buildHomeLanguageAlternates");
  }
  if (out.includes("buildArtistLanguageAlternates")) {
    imports.push("buildArtistLanguageAlternates");
  }
  if (out.includes("artworkDetailPath")) {
    imports.push("artworkDetailPath");
  }
  if (imports.length) {
    const uniq = [...new Set(imports)];
    const imp = `import { ${uniq.join(", ")} } from "@/lib/locale-routes";\n`;
    if (!out.includes('from "@/lib/locale-routes"')) {
      out = out.replace(/^import /m, imp + "import ");
    }
  }

  if (out.includes("<ArtworkJsonLd artwork={artwork} />")) {
    out = out.replace(
      "<ArtworkJsonLd artwork={artwork} />",
      `<ArtworkJsonLd artwork={artwork} pageUrl={\`https://fineartfree.com\${artworkDetailPath("${locale}", artwork.slug)}\`} inLanguage="${cfg.fromEs['"es"'].replace(/"/g, "")}" />`
    );
  }

  out = out.replace(
    /resolveGenreHubLink\([^,]+,\s*"[^"]+"\)/g,
    (m) => m.replace(/"[^"]+"\)$/, `"${locale}")`)
  );
  out = out.replace(
    /resolveStyleHubLink\([^,]+,\s*"[^"]+"\)/g,
    (m) => m.replace(/"[^"]+"\)$/, `"${locale}")`)
  );

  out = out.replace(
    /getArtistBioForLocale\([^,]+,\s*"[^"]+"\)/g,
    (m) => m.replace(/"[^"]+"\)$/, `"${locale}")`)
  );

  if (out.includes('languages: {\n        en:') || out.includes("languages: {\n      en:")) {
    out = out.replace(
      /languages:\s*\{[\s\S]*?\n\s*\},/,
      `languages: buildHomeLanguageAlternates(),`
    );
    if (!out.includes("buildHomeLanguageAlternates")) {
      out = out.replace(
        /^import type { Metadata }/m,
        'import { buildHomeLanguageAlternates } from "@/lib/locale-routes";\nimport type { Metadata }'
      );
    }
  }

  return out;
}

for (const [locale, cfg] of Object.entries(LOCALES)) {
  const r = cfg.fromEs;
  for (const [esRel] of FILE_MAP) {
    const src = path.join(esDir, esRel);
    if (!fs.existsSync(src)) {
      console.error("Missing", src);
      process.exit(1);
    }
    let content = fs.readFileSync(src, "utf8");
    content = patchContent(content, locale, cfg);

    if (esRel === "obras/[slug]/page.tsx") {
      content = content.replace(
        /^import type { Metadata } from "next";/m,
        `import type { Metadata } from "next";\nimport {\n  artworkDetailPath,\n  buildArtworkLanguageAlternates,\n} from "@/lib/locale-routes";`
      );
      content = content.replace(
        /alternates:\s*\{\s*canonical:[^,]+,\s*languages:\s*\{[^}]+\},?\s*\}/s,
        `alternates: {
      canonical: \`https://fineartfree.com\${artworkDetailPath("${locale}", slug)}\`,
      languages: buildArtworkLanguageAlternates(slug),
    }`
      );
      content = content.replace(
        /function resolveCategoryBreadcrumbEs/g,
        `function resolveCategoryBreadcrumb${cfg.fromEs.Es}`
      );
      content = content.replace(
        /resolveCategoryBreadcrumbEs/g,
        `resolveCategoryBreadcrumb${cfg.fromEs.Es}`
      );
      content = content.replace(
        /export default async function ArtworkDetailPageEs/g,
        `export default async function ArtworkDetailPage${cfg.fromEs.Es}`
      );
      content = content.replace(
        /getArtistProfileBySlug/g,
        "getArtistProfileBySlug"
      );
    }

    if (esRel.endsWith("page.tsx") && esRel !== "layout.tsx") {
      if (content.includes('canonical: absoluteUrl("/es/')) {
        const hub = esRel.includes("obras")
          ? "artworks"
          : esRel.includes("artistas")
            ? "artists"
            : esRel.includes("museos")
              ? "museums"
              : esRel.includes("generos")
                ? "genres"
                : esRel.includes("estilos")
                  ? "styles"
                  : null;
        if (hub) {
          content = content.replace(
            /alternates:\s*\{[\s\S]*?languages:\s*\{[\s\S]*?\},?\s*\}/,
            `alternates: {
    canonical: absoluteUrl(localePath("${locale}", "${hub}")),
    languages: buildHubLanguageAlternates("${hub}"),
  }`
          );
          if (!content.includes("localePath")) {
            content = content.replace(
              /import { absoluteUrl/g,
              'import { buildHubLanguageAlternates, localePath } from "@/lib/locale-routes";\nimport { absoluteUrl'
            );
          }
        }
      }
      if (esRel === "page.tsx") {
        content = content.replace(
          /alternates:\s*\{[\s\S]*?languages:\s*\{[\s\S]*?\},?\s*\}/,
          `alternates: {
    canonical: "https://fineartfree.com${r["/es"]}",
    languages: buildHomeLanguageAlternates(),
  }`
        );
        if (!content.includes("buildHomeLanguageAlternates")) {
          content = content.replace(
            /import { getT }/,
            'import { buildHomeLanguageAlternates } from "@/lib/locale-routes";\nimport { getT }'
          );
        }
      }
      if (esRel === "artistas/[slug]/page.tsx") {
        content = content.replace(
          /alternates:\s*\{[\s\S]*?languages:\s*\{[\s\S]*?\},?\s*\}/,
          `alternates: {
      canonical: absoluteUrl(artistDetailPath("${locale}", slug)),
      languages: buildArtistLanguageAlternates(slug),
    }`
        );
        content = content.replace(
          /import { absoluteUrl/g,
          'import { artistDetailPath, buildArtistLanguageAlternates } from "@/lib/locale-routes";\nimport { absoluteUrl'
        );
      }
    }

    const dest = destPath(locale, esRel, cfg);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content);
    console.log("Wrote", path.relative(root, dest));
  }
}

console.log("Done.");
