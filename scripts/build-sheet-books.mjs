// Generate imports/sheet-music/sheet-music-books.json — a handful of COMPLETE
// first-edition "books": each work is its own collection with every page in
// order (cover first). Replaces the old flat "Vintage Sheet Music" grab-bag.
// Run: node scripts/build-sheet-books.mjs
import { mkdirSync, writeFileSync } from "node:fs";

const LOC = ["sp", "pt", "fr", "ger", "it", "jp", "ko", "ru", "ch"];

// Each book: collection name, composer, medium, per-locale work title, and the
// ordered page files. page(n) builds the exact Commons filename for page n.
const BOOKS = [
  {
    collection: "Danse Macabre — Camille Saint-Saëns",
    artist: "Camille Saint-Saëns", medium: "Lithograph",
    t: { en: "Danse Macabre", sp: "Danza macabra", pt: "Dança macabra", fr: "Danse macabre", ger: "Danse macabre", it: "Danza macabra", jp: "死の舞踏", ko: "죽음의 무도", ru: "Пляска смерти", ch: "骷髅之舞" },
    pages: 24,
    page: (n) => `File:Danse macabre - poëme symphonique - op. 40 - de Camille Saint-Saëns ; transcription pour violon et piano par l'auteur - bpt6k1170198d (${String(n).padStart(2, "0")} of 24).jpg`,
  },
  {
    collection: "Fêtes galantes — Claude Debussy",
    artist: "Claude Debussy", medium: "Manuscript",
    t: { en: "Fêtes galantes", jp: "雅なる宴（フェート・ギャラント）", ko: "우아한 축제", ru: "Галантные празднества", ch: "华丽的庆典" },
    pages: 32,
    page: (n) => `File:"Fêtes galantes. Poésies de P. Verlaine. Musique A. Debussy...", pour 1 voix et piano (manuscrit autographe) - btv1b7200421x (${String(n).padStart(2, "0")} of 32).jpg`,
  },
  {
    collection: "Gymnopédie No. 2 — Erik Satie",
    artist: "Erik Satie", medium: "Lithograph",
    t: { en: "Gymnopédie No. 2", jp: "ジムノペディ 第2番", ko: "짐노페디 2번", ru: "Гимнопедия № 2", ch: "裸体歌舞 第2号" },
    pages: 8,
    page: (n) => `File:2ème gymnopédie - Erik Satie ; à Conrad Satie - btv1b52000072r (${n} of 8).jpg`,
  },
  {
    collection: "Maple Leaf Rag — Scott Joplin",
    artist: "Scott Joplin", medium: "Lithograph",
    t: { en: "Maple Leaf Rag", jp: "メイプル・リーフ・ラグ", ko: "메이플 리프 래그", ru: "Кленовый лист рэг", ch: "枫叶拉格" },
    // cover = "1st ed.jpg" (unnumbered), then 2,3,4
    files: ["File:Maple Leaf Rag 1st ed.jpg", "File:Maple Leaf Rag 1st ed 2.jpg", "File:Maple Leaf Rag 1st ed 3.jpg", "File:Maple Leaf Rag 1st ed 4.jpg"],
  },
];

const items = [];
for (const b of BOOKS) {
  const files = b.files ?? Array.from({ length: b.pages }, (_, i) => b.page(i + 1));
  files.forEach((file, i) => {
    const n = i + 1;
    const suffix = n === 1 ? "" : ` (${n})`;
    const title = { en: `${b.t.en}${suffix}` };
    for (const l of LOC) if (b.t[l]) title[l] = `${b.t[l]}${suffix}`;
    items.push({
      file,
      artist: b.artist,
      medium: b.medium,
      collection: b.collection,
      // cover (n=1) highest; stays inside the demoted print tier (< 0.02).
      score: Number((0.02 - n * 0.0001).toFixed(4)),
      title,
    });
  });
}

const set = {
  objectType: "print",
  source: "commons",
  medium_display: "Lithograph",
  tags: ["sheet music", "classical music", "music"],
  items,
};
mkdirSync("imports/sheet-music", { recursive: true });
writeFileSync("imports/sheet-music/sheet-music-books.json", JSON.stringify(set, null, 1));
const byBook = {};
for (const it of items) byBook[it.collection] = (byBook[it.collection] ?? 0) + 1;
console.log(`wrote imports/sheet-music/sheet-music-books.json — ${items.length} pages across ${BOOKS.length} books:`);
for (const [c, n] of Object.entries(byBook)) console.log(`  ${n.toString().padStart(2)}pp  ${c}`);
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100).replace(/-+$/, "");
const slugs = items.map((i) => slug(`${i.title.en}-sheet-music`));
const dup = slugs.filter((s, i) => slugs.indexOf(s) !== i);
console.log(dup.length ? `DUPLICATE SLUGS: ${[...new Set(dup)].join(", ")}` : "all slugs unique ✓");
