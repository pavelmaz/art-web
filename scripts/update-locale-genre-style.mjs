#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const LOCALES = [
  { code: "fr", suffix: "fr", prefix: "/fr", genresSeg: "genres", stylesSeg: "styles", artworkDir: "œuvres" },
  { code: "de", suffix: "de", prefix: "/de", genresSeg: "genres", stylesSeg: "stile", artworkDir: "werke" },
  { code: "it", suffix: "it", prefix: "/it", genresSeg: "generi", stylesSeg: "stili", artworkDir: "opere" },
  { code: "ko", suffix: "ko", prefix: "/ko", genresSeg: "장르", stylesSeg: "스타일", artworkDir: "작품" },
  { code: "ru", suffix: "ru", prefix: "/ru", genresSeg: "жанры", stylesSeg: "стили", artworkDir: "произведения" },
  { code: "zh", suffix: "zh", prefix: "/zh", genresSeg: "流派", stylesSeg: "风格", artworkDir: "作品" },
];

function s(loc) {
  return loc.suffix;
}

function writeGenresPage(loc) {
  const suf = s(loc);
  const content = `import { buildHubLanguageAlternates } from "@/lib/locale-routes";
import type { Metadata } from "next";

import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getCachedGenreHub } from "@/lib/cached-hub-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { supabase } from "@/lib/supabase";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Géneros Artísticos — Descarga Gratuita Dominio Público | Fine Art Free",
  description:
    "Explora arte de dominio público por género. Paisaje, Retrato, Naturaleza Muerta, Religioso y más — gratis para descargar en alta resolución.",
  alternates: {
    canonical: absoluteUrl("${loc.prefix}/${loc.genresSeg}"),
    languages: buildHubLanguageAlternates("genres"),
  },
  openGraph: {
    title: "Géneros Artísticos — Descarga Gratuita Dominio Público | Fine Art Free",
    description:
      "Explora arte de dominio público por género. Paisaje, Retrato, Naturaleza Muerta, Religioso y más — gratis para descargar en alta resolución.",
  },
};

type GenresPageProps = {
  searchParams: Promise<{ page?: string }>;
};

type GenreListRow = {
  id: string;
  slug: string;
  name: string;
  name_${suf}: string | null;
  slug_${suf}: string | null;
  description_${suf}: string | null;
};

export default async function GenresPage({ searchParams }: GenresPageProps) {
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const [aggregated, genresQuery] = await Promise.all([
    getCachedGenreHub(),
    supabase
      .from("genres")
      .select("id, slug, name, name_${suf}, slug_${suf}, description_${suf}")
      .order("name"),
  ]);

  const genresByName = new Map(
    ((genresQuery.data as GenreListRow[] | null) ?? []).map((g) => [g.name.toLowerCase(), g])
  );

  const items = aggregated.flatMap((row) => {
    const genre = genresByName.get(row.display.toLowerCase());
    if (!genre) {
      return [];
    }
    const linkSlug = genre.slug_${suf}?.trim() || genre.slug;
    const displayName = genre.name_${suf}?.trim() || genre.name;
    return [
      {
        name: displayName,
        href: \`${loc.prefix}/${loc.genresSeg}/\${linkSlug}\`,
        count: row.count,
        imageId: row.image_id,
        url: row.url,
      },
    ];
  });

  const totalPages = Math.max(1, getTotalPages(items.length));
  const paginated = items.slice(from, to + 1);

  return (
    <div className="space-y-8 px-5">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Géneros</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">Explorar obras de arte por género</p>
      </div>

      {paginated.length ? (
        <BrowseHubGrid items={paginated} />
      ) : (
        <p className="text-sm text-[#6b6b6b]">No se encontraron géneros.</p>
      )}

      <Pagination currentPage={page} totalPages={totalPages} basePath="${loc.prefix}/${loc.genresSeg}" />
    </div>
  );
}
`;
  const file = path.join(root, "app", loc.code, loc.genresSeg, "page.tsx");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function writeGenreSlugPage(loc) {
  const suf = s(loc);
  const content = `import { buildHubLanguageAlternates } from "@/lib/locale-routes";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionPageJsonLd } from "@/components/JsonLd";
import { Pagination } from "@/components/Pagination";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { supabase } from "@/lib/supabase";
import { absoluteUrl } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

export const revalidate = 86400;

type GenrePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

type ArtworkRow = {
  id: string;
  title: string;
  slug: string;
  artist_display: string | null;
  image_id: string | null;
  url: string | null;
  museum: string | null;
  style_title: string | null;
  genre_title: string | null;
  score: number | null;
  alt_text: string | null;
};

type GenreRow = {
  name: string;
  name_${suf}: string | null;
  description: string | null;
  description_${suf}: string | null;
  slug: string;
  slug_${suf}: string | null;
};

async function getGenreByLocalizedSlug(slug: string): Promise<GenreRow | null> {
  const cols = "name, name_${suf}, description, description_${suf}, slug, slug_${suf}";

  const { data: byLocalized } = await supabase
    .from("genres")
    .select(cols)
    .eq("slug_${suf}", slug)
    .maybeSingle();

  if (byLocalized) return byLocalized as GenreRow;

  const { data: byEnglish } = await supabase
    .from("genres")
    .select(cols)
    .eq("slug", slug)
    .maybeSingle();

  return (byEnglish as GenreRow) ?? null;
}

function toImageUrl(imageId: string | null): string {
  if (!imageId) return "";
  if (imageId.startsWith("http://") || imageId.startsWith("https://")) return imageId;
  return \`https://www.artic.edu/iiif/2/\${imageId}/full/400,/0/default.jpg\`;
}

export async function generateMetadata({ params }: GenrePageProps): Promise<Metadata> {
  const { slug } = await params;
  const genre = await getGenreByLocalizedSlug(slug);
  if (!genre) notFound();

  const displayName = genre.name_${suf}?.trim() || genre.name;

  const countQuery = await supabase
    .from("artworks")
    .select("id", { count: "exact", head: true })
    .eq("genre_title", genre.name);

  const totalCount = countQuery.count ?? 0;
  if (!totalCount) notFound();

  const title = \`Pinturas de \${displayName} — Descarga Gratuita | Fine Art Free\`;
  const description =
    genre.description_${suf}?.trim() ||
    genre.description?.trim() ||
    \`Descarga \${totalCount} pinturas de \${displayName} en alta resolución. Arte de dominio público gratis para uso personal y comercial.\`;

  const linkSlug = genre.slug_${suf}?.trim() || genre.slug;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(\`${loc.prefix}/${loc.genresSeg}/\${linkSlug}\`),
      languages: buildHubLanguageAlternates("genres"),
    },
    openGraph: { title, description },
  };
}

export default async function GenrePage({ params, searchParams }: GenrePageProps) {
  const { slug } = await params;
  const genre = await getGenreByLocalizedSlug(slug);
  if (!genre) notFound();

  const displayName = genre.name_${suf}?.trim() || genre.name;
  const intro = genre.description_${suf}?.trim() || genre.description?.trim() || null;
  const linkSlug = genre.slug_${suf}?.trim() || genre.slug;

  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const { data, count, error } = await supabase
    .from("artworks")
    .select(
      "id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score, alt_text",
      { count: "exact" }
    )
    .eq("genre_title", genre.name)
    .order("score", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[GenrePage/${loc.code}]", slug, genre.name, error);
    return <p>Error loading data</p>;
  }

  const rows = (data as ArtworkRow[] | null) ?? [];
  const totalCount = count ?? 0;

  const artworks: Artwork[] = rows.map((item) => ({
    id: item.id,
    title: item.title,
    slug: item.slug,
    artistName: item.artist_display ?? "Unknown artist",
    artistDisplay: item.artist_display ?? undefined,
    imageUrl: toImageUrl(item.image_id),
    imageId: item.image_id,
    museum: item.museum,
    styleTitle: item.style_title,
    genreTitle: item.genre_title,
    score: item.score,
    url: item.url,
    styleSlug: "unknown",
    styleName: item.style_title ?? "Unknown style",
    sourceUrl: item.url ?? undefined,
    altText: item.alt_text ?? null,
  }));

  const seen = new Set<string>();
  const uniqueArtworks = artworks.filter((artwork) => {
    if (seen.has(artwork.id)) return false;
    seen.add(artwork.id);
    return true;
  });

  if (!uniqueArtworks.length) notFound();

  return (
    <div className="space-y-6 px-5">
      <CollectionPageJsonLd
        name={\`Pinturas de \${displayName}\`}
        path={\`${loc.prefix}/${loc.genresSeg}/\${linkSlug}\`}
        description={intro}
        numberOfItems={totalCount}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "${loc.prefix}" },
          { label: "Genres", href: "${loc.prefix}/${loc.genresSeg}" },
          { label: displayName },
        ]}
        currentPath={\`${loc.prefix}/${loc.genresSeg}/\${linkSlug}\`}
      />
      <h1 className="text-3xl font-bold tracking-tight">Pinturas de {displayName}</h1>
      {intro ? (
        <div className="max-w-3xl mb-8 text-sm leading-relaxed text-[#4a4a4a]">
          <p>{intro}</p>
        </div>
      ) : null}
      <ArtworkGrid artworks={uniqueArtworks} basePath="${loc.prefix}" />
      <Pagination
        currentPage={page}
        totalPages={Math.max(1, getTotalPages(totalCount || artworks.length))}
        basePath={\`${loc.prefix}/${loc.genresSeg}/\${linkSlug}\`}
      />
    </div>
  );
}
`;
  const file = path.join(root, "app", loc.code, loc.genresSeg, "[slug]", "page.tsx");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function writeStylesPage(loc) {
  const suf = s(loc);
  const content = `import { buildHubLanguageAlternates } from "@/lib/locale-routes";
import type { Metadata } from "next";

import { BrowseHubGrid, type BrowseHubItem } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getCachedStylesHubData } from "@/lib/cached-hub-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { supabase } from "@/lib/supabase";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Movimientos y Estilos Artísticos — Descarga Gratuita | Fine Art Free",
  description:
    "Explora arte de dominio público por movimiento. Barroco, Impresionismo, Siglo de Oro Holandés, Renacimiento y más — gratis para descargar.",
  alternates: {
    canonical: absoluteUrl("${loc.prefix}/${loc.stylesSeg}"),
    languages: buildHubLanguageAlternates("styles"),
  },
  openGraph: {
    title: "Movimientos y Estilos Artísticos — Descarga Gratuita | Fine Art Free",
    description:
      "Explora arte de dominio público por movimiento. Barroco, Impresionismo, Siglo de Oro Holandés, Renacimiento y más — gratis para descargar.",
  },
};

type StylesPageProps = {
  searchParams: Promise<{ page?: string }>;
};

type LocalizedStyleRow = {
  name: string;
  name_${suf}: string | null;
  slug: string;
  slug_${suf}: string | null;
  description_${suf}: string | null;
};

export default async function StylesPage({ searchParams }: StylesPageProps) {
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  let agg;
  try {
    const data = await getCachedStylesHubData();
    agg = data.agg;
  } catch {
    return <p>Error loading data</p>;
  }

  const { data: localizedStyles } = await supabase
    .from("styles")
    .select("name, name_${suf}, slug, slug_${suf}, description_${suf}")
    .order("name", { ascending: true });

  const stylesByName = new Map(
    ((localizedStyles as LocalizedStyleRow[] | null) ?? []).map((s) => [s.name.toLowerCase(), s])
  );

  const byLower = new Map(agg.map((a) => [a.display.toLowerCase(), a]));

  if (!stylesByName.size) {
    return <p className="text-sm text-[#6b6b6b]">No se pudieron cargar los estilos.</p>;
  }

  const hubItems: BrowseHubItem[] = Array.from(stylesByName.values()).map((s) => {
    const a = byLower.get(s.name.toLowerCase());
    const displayName = s.name_${suf}?.trim() || s.name;
    const linkSlug = s.slug_${suf}?.trim() || s.slug;
    return {
      name: displayName,
      href: \`${loc.prefix}/${loc.stylesSeg}/\${linkSlug}\`,
      count: a?.count ?? 0,
      imageId: a?.image_id ?? null,
      url: a?.url ?? null,
    };
  });
  hubItems.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name);
  });

  const totalPages = Math.max(1, getTotalPages(hubItems.length));
  const paginated = hubItems.slice(from, to + 1);

  return (
    <div className="space-y-8 px-5">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Estilos</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">Explorar obras de arte por estilo</p>
      </div>

      {paginated.length ? (
        <BrowseHubGrid items={paginated} />
      ) : (
        <p className="text-sm text-[#6b6b6b]">No se encontraron estilos.</p>
      )}

      <Pagination currentPage={page} totalPages={totalPages} basePath="${loc.prefix}/${loc.stylesSeg}" />
    </div>
  );
}
`;
  const file = path.join(root, "app", loc.code, loc.stylesSeg, "page.tsx");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function writeStyleSlugPage(loc) {
  const suf = s(loc);
  const content = `import { buildHubLanguageAlternates } from "@/lib/locale-routes";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionPageJsonLd } from "@/components/JsonLd";
import { Pagination } from "@/components/Pagination";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { supabase } from "@/lib/supabase";
import { absoluteUrl, styleSlugLookupVariants } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

export const revalidate = 86400;

type StyleRow = {
  name: string;
  name_${suf}: string | null;
  description: string | null;
  description_${suf}: string | null;
  slug: string;
  slug_${suf}: string | null;
};

type ArtworkRow = {
  id: string;
  title: string;
  slug: string;
  artist_display: string | null;
  image_id: string | null;
  url: string | null;
  museum: string | null;
  style_title: string | null;
  genre_title: string | null;
  score: number | null;
  alt_text: string | null;
};

type StylePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

function unslugifyStyle(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toImageUrl(imageId: string | null): string {
  if (!imageId) return "";
  if (imageId.startsWith("http://") || imageId.startsWith("https://")) return imageId;
  return \`https://www.artic.edu/iiif/2/\${imageId}/full/400,/0/default.jpg\`;
}

async function getStyleByLocalizedSlug(slug: string): Promise<StyleRow | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;

  const cols = "name, name_${suf}, description, description_${suf}, slug, slug_${suf}";

  for (const variant of styleSlugLookupVariants(trimmed)) {
    const { data: byLocalized } = await supabase
      .from("styles")
      .select(cols)
      .ilike("slug_${suf}", variant)
      .limit(1)
      .maybeSingle();

    if (byLocalized) return byLocalized as StyleRow;
  }

  for (const variant of styleSlugLookupVariants(trimmed)) {
    const { data: byEnglish } = await supabase
      .from("styles")
      .select(cols)
      .ilike("slug", variant)
      .limit(1)
      .maybeSingle();

    if (byEnglish) return byEnglish as StyleRow;
  }

  return null;
}

export async function generateMetadata({ params }: StylePageProps): Promise<Metadata> {
  const { slug } = await params;
  const style = await getStyleByLocalizedSlug(slug);
  const englishName = style?.name ?? unslugifyStyle(slug);
  const displayName = style?.name_${suf}?.trim() || englishName;

  const countQuery = await supabase
    .from("artworks")
    .select("id", { count: "exact", head: true })
    .eq("style_title", englishName);

  const totalCount = countQuery.count ?? 0;

  if (!totalCount) {
    notFound();
  }

  const title = \`Arte \${displayName} — Descarga Gratuita Dominio Público | Fine Art Free\`;
  const description =
    style?.description_${suf}?.trim() ||
    style?.description?.trim() ||
    \`Descarga \${totalCount} obras de arte \${displayName} en alta resolución. Arte de dominio público gratis para uso personal y comercial.\`;

  const linkSlug = style?.slug_${suf}?.trim() || style?.slug || slug;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(\`${loc.prefix}/${loc.stylesSeg}/\${linkSlug}\`),
      languages: buildHubLanguageAlternates("styles"),
    },
    openGraph: { title, description },
  };
}

export default async function StylePage({ params, searchParams }: StylePageProps) {
  const { slug } = await params;
  const style = await getStyleByLocalizedSlug(slug);
  const englishName = style?.name ?? unslugifyStyle(slug);
  const displayName = style?.name_${suf}?.trim() || englishName;
  const intro = style?.description_${suf}?.trim() || style?.description?.trim() || null;
  const linkSlug = style?.slug_${suf}?.trim() || style?.slug || slug;

  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const { data, count, error } = await supabase
    .from("artworks")
    .select(
      "id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score, alt_text",
      { count: "exact" }
    )
    .eq("style_title", englishName)
    .order("score", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[StylePage/${loc.code}]", slug, englishName, error);
    return <p>Error loading data</p>;
  }

  const rows = (data as ArtworkRow[] | null) ?? [];
  const totalCount = count ?? 0;

  const artworks: Artwork[] = rows.map((item) => ({
    id: item.id,
    title: item.title,
    slug: item.slug,
    artistName: item.artist_display ?? "Unknown artist",
    artistDisplay: item.artist_display ?? undefined,
    imageUrl: toImageUrl(item.image_id),
    imageId: item.image_id,
    museum: item.museum,
    styleTitle: item.style_title,
    genreTitle: item.genre_title,
    score: item.score,
    url: item.url,
    styleSlug: "unknown",
    styleName: item.style_title ?? "Unknown style",
    sourceUrl: item.url ?? undefined,
    altText: item.alt_text ?? null,
  }));

  if (!artworks.length) notFound();

  return (
    <div className="space-y-6 px-5">
      <CollectionPageJsonLd
        name={\`Arte \${displayName}\`}
        path={\`${loc.prefix}/${loc.stylesSeg}/\${linkSlug}\`}
        description={intro}
        numberOfItems={totalCount}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "${loc.prefix}" },
          { label: "Styles", href: "${loc.prefix}/${loc.stylesSeg}" },
          { label: displayName },
        ]}
        currentPath={\`${loc.prefix}/${loc.stylesSeg}/\${linkSlug}\`}
      />
      <h1 className="text-3xl font-bold tracking-tight">Arte {displayName}</h1>
      {intro ? (
        <div className="max-w-3xl mb-8 text-sm leading-relaxed text-[#4a4a4a]">
          <p>{intro}</p>
        </div>
      ) : null}
      <ArtworkGrid artworks={artworks} basePath="${loc.prefix}" />
      <Pagination
        currentPage={page}
        totalPages={Math.max(1, getTotalPages(totalCount))}
        basePath={\`${loc.prefix}/${loc.stylesSeg}/\${linkSlug}\`}
      />
    </div>
  );
}
`;
  const file = path.join(root, "app", loc.code, loc.stylesSeg, "[slug]", "page.tsx");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function patchArtworkPage(loc) {
  const suf = s(loc);
  const file = path.join(root, "app", loc.code, loc.artworkDir, "[slug]", "page.tsx");
  let c = fs.readFileSync(file, "utf8");

  const helpers = `
async function resolveGenreHubLinkLocal(
  genreTitleEnglish: string
): Promise<{ href: string; label: string } | null> {
  const name = genreTitleEnglish.trim();
  if (!name) return null;

  const { data, error } = await supabase
    .from("genres")
    .select("name, name_${suf}, slug, slug_${suf}")
    .eq("name", name)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as {
    name: string;
    name_${suf}: string | null;
    slug: string;
    slug_${suf}: string | null;
  };

  const linkSlug = row.slug_${suf}?.trim() || row.slug;
  const label = row.name_${suf}?.trim() || row.name;
  return { href: \`${loc.prefix}/${loc.genresSeg}/\${linkSlug}\`, label };
}

async function resolveStyleHubLinkLocal(
  styleTitleEnglish: string
): Promise<{ href: string; label: string } | null> {
  const name = styleTitleEnglish.trim();
  if (!name) return null;

  const { data, error } = await supabase
    .from("styles")
    .select("name, name_${suf}, slug, slug_${suf}")
    .eq("name", name)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as {
    name: string;
    name_${suf}: string | null;
    slug: string;
    slug_${suf}: string | null;
  };

  const linkSlug = row.slug_${suf}?.trim() || row.slug;
  const label = row.name_${suf}?.trim() || row.name;
  return { href: \`${loc.prefix}/${loc.stylesSeg}/\${linkSlug}\`, label };
}
`;

  c = c.replace(
    /import \{ resolveGenreHubLink, resolveStyleHubLink \} from "@\/lib\/resolve-genre-style-links";\n/,
    ""
  );

  if (!c.includes("resolveGenreHubLinkLocal")) {
    c = c.replace(
      /type ArtworkPageProps = \{/,
      `${helpers}\ntype ArtworkPageProps = {`
    );
  }

  c = c.replace(/resolveGenreHubLink\(/g, "resolveGenreHubLinkLocal(");
  c = c.replace(/resolveStyleHubLink\(/g, "resolveStyleHubLinkLocal(");
  c = c.replace(/resolveGenreHubLinkLocal\([^,]+,\s*"[^"]+"\)/g, (m) =>
    m.replace(/,\s*"[^"]+"\)/, ")")
  );
  c = c.replace(/resolveStyleHubLinkLocal\([^,]+,\s*"[^"]+"\)/g, (m) =>
    m.replace(/,\s*"[^"]+"\)/, ")")
  );

  fs.writeFileSync(file, c);
}

for (const loc of LOCALES) {
  writeGenresPage(loc);
  writeGenreSlugPage(loc);
  writeStylesPage(loc);
  writeStyleSlugPage(loc);
  patchArtworkPage(loc);
  console.log("Updated", loc.code);
}

console.log("Done.");
