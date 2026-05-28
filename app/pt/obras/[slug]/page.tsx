import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DownloadButton } from "@/components/DownloadButton";
import { ArtworkJsonLd } from "@/components/ArtworkJsonLd";
import {
  ArtworkInsightsControls,
  ArtworkInsightsOverlay,
  ArtworkInsightsProvider,
} from "@/components/ArtworkInsights";
import { SectionCtaLink } from "@/components/SectionCtaLink";
import { ArtworkZoomImage } from "@/components/ArtworkZoomImage";
import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getT } from "@/lib/translations";
import { resolveGenreHubLink, resolveStyleHubLink } from "@/lib/resolve-genre-style-links";
import { absoluteUrl, artworkDetailImageUrl, artworkGridImageUrl, artworkImageUrl, artworkOriginalUrl, generateAltText, slugify } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

export const revalidate = 86400;

type ArtworkRow = {
  id: string;
  slug: string;
  title: string;
  artist_display: string | null;
  url: string | null;
  image_id: string | null;
  museum: string | null;
  style_title: string | null;
  genre_title: string | null;
  medium_display: string | null;
  date_display: string | null;
  dimensions: string | null;
  description: string | null;
  description_pt: string | null;
};

async function getArtistDeathYear(artistName: string | null): Promise<number | null> {
  const normalized = artistName?.trim();
  if (!normalized) {
    return null;
  }

  const attempts = [
    () => supabase.from("artists").select("death_year").eq("name", normalized).maybeSingle(),
    () => supabase.from("artists").select("death_year").eq("artist_display", normalized).maybeSingle(),
    () => supabase.from("artists").select("death_year").ilike("name", normalized).limit(1).maybeSingle(),
    () => supabase.from("artists").select("death_year").ilike("artist_display", normalized).limit(1).maybeSingle(),
  ] as const;

  for (const query of attempts) {
    const { data, error } = await query();
    if (error || !data) {
      continue;
    }

    const value = (data as { death_year?: unknown }).death_year;
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

type ArtworkPageProps = {
  params: Promise<{ slug: string }>;
};

async function resolveCategoryBreadcrumbPt(
  artwork: ArtworkRow
): Promise<{ label: string; href: string } | null> {
  if (artwork.genre_title?.trim()) {
    const g = await resolveGenreHubLink(artwork.genre_title.trim(), "pt");
    if (g) return { label: g.label, href: g.href };
  }
  if (artwork.style_title?.trim()) {
    const s = await resolveStyleHubLink(artwork.style_title.trim(), "pt");
    if (s) return { label: s.label, href: s.href };
  }
  return null;
}

function BreadcrumbJsonLd({
  artwork,
  category,
}: {
  artwork: ArtworkRow;
  category: { label: string; href: string } | null;
}) {
  const siteUrl = "https://fineartfree.com";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Início",
        item: `${siteUrl}/pt`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: category?.label || "Obras",
        item: category ? `${siteUrl}${category.href}` : `${siteUrl}/pt/obras`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: artwork.title,
        item: `${siteUrl}/pt/obras/${artwork.slug}`,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

function stripOpeningDecorativeQuote(text: string): string {
  const t = text.trim();
  if (!t.startsWith('"') && !t.startsWith("\u201c")) {
    return text.trim();
  }

  const straight = '."';
  const curly = `.\u201d`;
  let cutEnd = -1;
  const iStraight = t.indexOf(straight);
  if (iStraight !== -1) {
    cutEnd = iStraight + straight.length;
  }
  const iCurly = t.indexOf(curly);
  if (iCurly !== -1) {
    const end = iCurly + curly.length;
    if (cutEnd === -1 || end < cutEnd) {
      cutEnd = end;
    }
  }

  if (cutEnd === -1) {
    return text.trim();
  }

  return t.slice(cutEnd).trimStart();
}

function splitSentencesOnPeriodSpace(text: string): string[] {
  const cleaned = text.trim();
  if (!cleaned) {
    return [];
  }

  const parts = cleaned.split(". ");
  return parts
    .map((part, i) => {
      const p = part.trim();
      if (!p) {
        return "";
      }
      return i < parts.length - 1 ? `${p}.` : p;
    })
    .filter(Boolean);
}

function groupEveryThreeSentences(sentences: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < sentences.length; i += 3) {
    out.push(sentences.slice(i, i + 3).join(" "));
  }
  return out;
}

function parseBoldAsterisk(text: string): ReactNode {
  const segments = text.split(/(\*[^*]+\*)/g);
  const nodes: ReactNode[] = [];
  let key = 0;
  for (const seg of segments) {
    if (!seg) {
      continue;
    }
    if (seg.startsWith("*") && seg.endsWith("*") && seg.length > 2) {
      nodes.push(<strong key={key++}>{seg.slice(1, -1)}</strong>);
    } else {
      nodes.push(seg);
    }
  }
  return nodes.length === 1 ? nodes[0] : <>{nodes}</>;
}

function ArtworkDescriptionFormatted({ description }: { description: string }) {
  const body = stripOpeningDecorativeQuote(description);
  const sentences = splitSentencesOnPeriodSpace(body);
  const paragraphs = groupEveryThreeSentences(sentences);

  return (
    <div className="space-y-4 mt-4">
      {paragraphs.map((para, index) => (
        <p key={index} className="text-sm leading-relaxed text-[#3a3a3a]">
          {parseBoldAsterisk(para)}
        </p>
      ))}
    </div>
  );
}

async function getArtworkBySlug(slug: string): Promise<ArtworkRow | null> {
  const selectColumns =
    "id, slug, title, artist_display, url, image_id, museum, style_title, genre_title, medium_display, date_display, dimensions, description, description_pt";

  const primary = await supabase
    .from("artworks")
    .select(selectColumns)
    .eq("slug", slug)
    .single();

  if (!primary.error && primary.data) {
    return primary.data as ArtworkRow;
  }

  if (primary.error && primary.error.code !== "PGRST116") {
    throw primary.error;
  }

  const fallback = await supabase
    .from("daily_artworks")
    .select(
      selectColumns
    )
    .eq("slug", slug)
    .single();

  if (fallback.error) {
    if (fallback.error.code === "PGRST116") {
      return null;
    }
    throw fallback.error;
  }

  return fallback.data as ArtworkRow;
}

export async function generateMetadata({ params }: ArtworkPageProps): Promise<Metadata> {
  const { slug } = await params;
  const artwork = await getArtworkBySlug(slug);

  if (!artwork) {
    return {
      title: "Obra não encontrada",
    };
  }

  const artist = artwork.artist_display ?? "Artista desconhecido";
  const title = `${artwork.title} de ${artist} — Download Gratuito | Fine Art Free`;

  const { data: ptTranslation } = await supabase
    .from("artwork_translations")
    .select("alt_text, seo_description")
    .eq("artwork_id", artwork.id)
    .eq("locale", "pt")
    .single();

  const description =
    ptTranslation?.seo_description ||
    artwork.description_pt?.slice(0, 200) ||
    `${artwork.title} de ${artist}. Arte de domínio público grátis.`;

  const imageUrl = artworkImageUrl(artwork);

  return {
    title,
    description,
    alternates: {
      canonical: `https://fineartfree.com/pt/obras/${slug}`,
      languages: {
        'en': `https://fineartfree.com/artworks/${slug}`,
        'es': `https://fineartfree.com/es/obras/${slug}`,
        'pt': `https://fineartfree.com/pt/obras/${slug}`,
      },
    },
    openGraph: {
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function ArtworkDetailPagePt({ params }: ArtworkPageProps) {
  const { slug } = await params;
  const artwork = await getArtworkBySlug(slug);
  const t = getT('pt');

  if (!artwork) {
    notFound();
  }

  const sessionSupabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sessionSupabase.auth.getUser();
  let isPro = false;
  if (user) {
    const { data: profile } = await sessionSupabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .maybeSingle();
    isPro = profile?.subscription_status === "active";
  }

  const imageUrl = artworkDetailImageUrl(artwork);
  const maxDownloadHref = artworkOriginalUrl(artwork) || imageUrl;
  const artist = artwork.artist_display ?? "Artista desconhecido";

  const { data: ptTranslation } = await supabase
    .from("artwork_translations")
    .select("alt_text, seo_description")
    .eq("artwork_id", artwork.id)
    .eq("locale", "pt")
    .single();

  const artistDeathYear = await getArtistDeathYear(artwork.artist_display);
  const artistSlug = artwork.artist_display?.trim() ? slugify(artwork.artist_display) : null;
  let artistArtworkCount = 0;

  if (artwork.artist_display?.trim()) {
    const countQuery = await supabase
      .from("artworks")
      .select("id", { count: "exact", head: true })
      .eq("artist_display", artwork.artist_display);
    artistArtworkCount = countQuery.count ?? 0;
  }

  const category = await resolveCategoryBreadcrumbPt(artwork);
  const breadcrumbItems = [
    { label: "Início", href: "/pt" },
    ...(category ? [category] : []),
    ...(artwork.artist_display?.trim()
      ? [{ label: artwork.artist_display.trim(), href: `/pt/artistas/${slugify(artwork.artist_display)}` }]
      : []),
    { label: artwork.title },
  ];

  let relatedArtworks: Artwork[] = [];

  if (artwork.artist_display?.trim()) {
    const relatedQuery = await supabase
      .from("artworks")
      .select("id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score, alt_text")
      .eq("artist_display", artwork.artist_display)
      .order("score", { ascending: false })
      .limit(20);

    if (!relatedQuery.error) {
      const rows =
        (relatedQuery.data as
          | Array<{
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
            }>
          | null) ?? [];

      relatedArtworks = rows
        .filter((item) => item.slug !== artwork.slug)
        .slice(0, 10)
        .map((item) => ({
          id: item.id,
          title: item.title,
          slug: item.slug,
          artistName: item.artist_display ?? artist,
          artistDisplay: item.artist_display ?? undefined,
          imageUrl: artworkGridImageUrl(item),
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
    }
  }

  const genreHubLink = artwork.genre_title?.trim()
    ? await resolveGenreHubLink(artwork.genre_title.trim(), "pt")
    : null;

  let relatedByGenre: Artwork[] = [];
  if (artwork.genre_title) {
    const { data: genreData } = await supabase
      .from("artworks")
      .select("id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, alt_text")
      .eq("genre_title", artwork.genre_title)
      .neq("id", artwork.id)
      .limit(6);

    if (genreData) {
      relatedByGenre = (genreData as Array<{
        id: string;
        title: string;
        slug: string;
        artist_display: string | null;
        image_id: string | null;
        url: string | null;
        museum: string | null;
        style_title: string | null;
        genre_title: string | null;
        alt_text: string | null;
      }>).map((item) => ({
        id: item.id,
        title: item.title,
        slug: item.slug,
        artistName: item.artist_display ?? "Unknown artist",
        artistDisplay: item.artist_display ?? undefined,
        imageUrl: artworkGridImageUrl(item),
        imageId: item.image_id,
        museum: item.museum,
        styleTitle: item.style_title,
        genreTitle: item.genre_title,
        score: null,
        url: item.url,
        styleSlug: "unknown",
        styleName: item.style_title ?? "Unknown style",
        sourceUrl: item.url ?? undefined,
        altText: item.alt_text ?? null,
      }));
    }
  }

  const descriptionText = artwork.description_pt || artwork.description;

  return (
    <article className="bg-[#faf9f7] py-8">
      <div className="mx-auto max-w-7xl px-5">
        <ArtworkJsonLd artwork={artwork} />
        <BreadcrumbJsonLd artwork={artwork} category={category} />

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <ArtworkInsightsProvider artwork={artwork} locale="pt">
            <div className="flex-1 space-y-4">
              <div className="bg-white p-2 sm:p-6">
                {imageUrl ? (
                  <>
                    <div className="flex justify-center">
                      <div className="relative w-fit max-w-full">
                        <ArtworkZoomImage
                          src={imageUrl}
                          fullSrc={artworkOriginalUrl(artwork) || imageUrl}
                          alt={ptTranslation?.alt_text || generateAltText(artwork)}
                        />
                        <ArtworkInsightsOverlay />
                      </div>
                    </div>
                    <ArtworkInsightsControls />
                  </>
                ) : (
                  <div className="flex h-[420px] w-full items-center justify-center bg-neutral-200 text-neutral-600">
                    No image available
                  </div>
                )}
              </div>
              <Breadcrumbs items={breadcrumbItems} currentPath={`/pt/obras/${artwork.slug}`} includeJsonLd={false} />
            </div>
          </ArtworkInsightsProvider>

          <aside className="w-full lg:w-80">
            <div className="space-y-4 rounded-2xl bg-[#f5f5f5] p-5 lg:sticky lg:top-6">
              <div>
                <h1 className="mb-1 text-lg font-semibold text-[#1a1a1a]">{artwork.title}</h1>
                {artistSlug ? (
                  <Link href={`/pt/artistas/${artistSlug}`} className="text-sm text-[#6b6b6b] hover:text-[#1a1a1a]">
                    {artist}
                  </Link>
                ) : (
                  <p className="text-sm text-[#6b6b6b]">{artist}</p>
                )}
              </div>

              <p className="text-sm text-[#6b6b6b]">{artistArtworkCount} {t.artworks}</p>

              <div className="my-4 border-t border-[#e8e6e1]" />

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 rounded-lg bg-[#eceff3] p-3">
                  <div>
                    <p className="text-sm font-medium text-[#1a1a1a]">Standard</p>
                    <p className="text-xs text-[#999]">JPG</p>
                  </div>
                  <DownloadButton imageUrl={imageUrl} label={t.downloadStandard} />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-lg bg-[#eceff3] p-3">
                  <div>
                    <p className="text-sm font-medium text-[#1a1a1a]">🔒 {t.downloadMaxSize}</p>
                    <p className="text-xs text-[#999]">{t.downloadMaxFormat}</p>
                  </div>
                  {isPro ? (
                    <a
                      href={maxDownloadHref}
                      download
                      className="inline-flex items-center justify-center rounded-md bg-[#9e9e9e] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#8a8a8a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6b6b6b] focus-visible:ring-offset-2"
                    >
                      {t.downloadStandard}
                    </a>
                  ) : (
                    <Link
                      href="/fineart-pro"
                      className="inline-flex items-center justify-center rounded-md bg-[#9e9e9e] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#8a8a8a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6b6b6b] focus-visible:ring-offset-2"
                    >
                      {t.downloadStandard}
                    </Link>
                  )}
                </div>
              </div>

              <div className="my-4 border-t border-[#e8e6e1]" />

              <div className="rounded-lg bg-[#eceff3] p-3">
                <p className="text-xs leading-relaxed text-[#4a4a4a]">
                  {t.licenseText}
                </p>
                <details className="mt-2 text-xs text-[#4a4a4a]">
                  <summary className="inline-flex cursor-pointer list-none select-none items-center gap-1 text-[#6b6b6b] marker:content-none">
                    ⓘ {t.whyPublicDomain}
                  </summary>
                  <div className="mt-3 rounded-lg bg-white p-4">
                    <p className="leading-relaxed text-[#4a4a4a]">
                      O artista faleceu em {artistDeathYear ?? "um ano desconhecido"}, portanto esta obra é de
                      domínio público no seu país de origem e em outros países onde o prazo de direitos autorais
                      é a vida do artista mais 70 anos ou menos.
                    </p>
                  </div>
                </details>
              </div>

              <div className="my-4 border-t border-[#e8e6e1]" />

              <div className="space-y-3 rounded-lg bg-[#eceff3] p-3">
                {artwork.medium_display?.trim() ? (
                  <div>
                    <p className="text-xs text-[#999]">{t.medium}</p>
                    <p className="text-sm text-[#1a1a1a]">{artwork.medium_display}</p>
                  </div>
                ) : null}

                {artwork.date_display?.trim() ? (
                  <div>
                    <p className="text-xs text-[#999]">{t.date}</p>
                    <p className="text-sm text-[#1a1a1a]">{artwork.date_display}</p>
                  </div>
                ) : null}

                {artwork.dimensions?.trim() ? (
                  <div>
                    <p className="text-xs text-[#999]">{t.dimensions}</p>
                    <p className="text-sm text-[#1a1a1a]">{artwork.dimensions}</p>
                  </div>
                ) : null}

                {artwork.museum?.trim() ? (
                  <div>
                    <p className="text-xs text-[#999]">{t.museum}</p>
                    <Link
                      href={`/pt/museus/${slugify(artwork.museum)}`}
                      className="text-sm text-[#1a1a1a] underline"
                    >
                      {artwork.museum}
                    </Link>
                  </div>
                ) : null}
              </div>

              <div className="border-t border-[#e8e6e1]" />

              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs text-green-700">
                {t.publicDomain}
              </span>
            </div>
          </aside>
        </div>

        {descriptionText?.trim() ? (
          <section className="mt-10">
            <h2 className="mb-4 text-base font-semibold text-[#1a1a1a]">
              {artwork.title} — {t.historyAndFacts}
            </h2>
            <div>
              <ArtworkDescriptionFormatted description={descriptionText.trim()} />
            </div>
            {artistSlug && relatedArtworks.length === 0 ? (
              <SectionCtaLink href={`/pt/artistas/${artistSlug}`}>{t.browseAll}</SectionCtaLink>
            ) : null}
          </section>
        ) : null}

        {relatedArtworks.length > 0 && artistSlug ? (
          <section className="mt-10">
            <h2 className="mb-4 text-base font-semibold">{t.moreByArtist} {artist}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatedArtworks.map((item) => (
                <a key={item.id} href={`/pt/obras/${item.slug}`} className="group block">
                  <div className="overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.altText || item.title}
                      className="w-full h-auto max-h-[300px] object-contain group-hover:scale-[1.03] transition-transform duration-300"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <p className="mt-2 text-[13px] font-medium leading-snug text-[#1a1a1a] line-clamp-2">
                    {item.title}
                  </p>
                  <p className="mt-[2px] text-[12px] text-[#6b6b6b] truncate">
                    {item.artistDisplay || item.artistName}
                  </p>
                </a>
              ))}
            </div>
            <SectionCtaLink href={`/pt/artistas/${artistSlug}`}>{t.browseAll}</SectionCtaLink>
          </section>
        ) : null}

        {relatedByGenre.length > 0 && artwork.genre_title ? (
          <section className="mt-12">
            <h2 className="mb-4 text-base font-semibold">Mais arte de {genreHubLink?.label ?? artwork.genre_title}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatedByGenre.map((item) => (
                <a key={item.id} href={`/pt/obras/${item.slug}`} className="group block">
                  <div className="overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.altText || item.title}
                      className="w-full h-auto max-h-[300px] object-contain group-hover:scale-[1.03] transition-transform duration-300"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <p className="mt-2 text-[13px] font-medium leading-snug text-[#1a1a1a] line-clamp-2">
                    {item.title}
                  </p>
                  <p className="mt-[2px] text-[12px] text-[#6b6b6b] truncate">
                    {item.artistDisplay || item.artistName}
                  </p>
                </a>
              ))}
            </div>
            {genreHubLink ? (
              <SectionCtaLink href={genreHubLink.href}>{t.browseAll}</SectionCtaLink>
            ) : null}
          </section>
        ) : null}
      </div>
    </article>
  );
}
