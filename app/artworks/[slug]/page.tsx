import { buildArtworkLanguageAlternates } from "@/lib/locale-routes";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DownloadButton } from "@/components/DownloadButton";
import { ProDownloadRow } from "@/components/ProDownloadRow";
import { ArtworkJsonLd } from "@/components/ArtworkJsonLd";
import { ArtworkZoomImage } from "@/components/ArtworkZoomImage";
import {
  ArtworkInsightsControls,
  ArtworkInsightsOverlay,
  ArtworkInsightsProvider,
} from "@/components/ArtworkInsights";
import { SectionCtaLink } from "@/components/SectionCtaLink";
import { ArtistChip } from "@/components/ArtistChip";
import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getT } from "@/lib/translations";
import { parseArtworkDeathYear } from "@/lib/artwork-death-year";
import { absoluteUrl, artworkDetailImageUrl, artworkGridImageUrl, artworkImageUrl, artworkMediumKind, artworkOriginalUrl, generateAltText, slugify } from "@/lib/utils";
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
  death_year: number | null;
};


type ArtworkPageProps = {
  params: Promise<{ slug: string }>;
};

const VALID_GENRE_SLUGS = new Set([
  "landscape", "marine", "architecture", "genre-scene",
  "religious", "portrait", "figurative", "decorative-art",
  "historical", "interior", "botanical", "abstract",
  "animal", "still-life", "mythology", "allegory",
  "drawing", "illustration",
]);

function getCategoryBreadcrumb(artwork: ArtworkRow): { label: string; href: string } | null {
  if (artwork.genre_title?.trim()) {
    const genreSlug = artwork.genre_title.trim().toLowerCase().replace(/\s+/g, "-");
    if (VALID_GENRE_SLUGS.has(genreSlug)) {
      return { label: artwork.genre_title.trim(), href: `/genres/${genreSlug}` };
    }
  }
  if (artwork.style_title?.trim()) {
    return { label: artwork.style_title.trim(), href: `/styles/${slugify(artwork.style_title)}` };
  }
  return null;
}

function BreadcrumbJsonLd({ artwork }: { artwork: ArtworkRow }) {
  const siteUrl = "https://fineartfree.com";
  const category = getCategoryBreadcrumb(artwork);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: category?.label || "Artworks",
        item: category ? `${siteUrl}${category.href}` : `${siteUrl}/artworks`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: artwork.title,
        item: `${siteUrl}/artworks/${artwork.slug}`,
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

function truncateDescription(text: string | null): string {
  if (!text) {
    return "";
  }

  if (text.length <= 160) {
    return text;
  }

  return `${text.slice(0, 157)}...`;
}

/** Strip a leading decorative open-quote block ending at the first `."` or `.”`. */
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
    <div className="space-y-4">
      {paragraphs.map((para, index) => (
        <p key={index} className="text-[15px] leading-7 text-[#3a3a3a]">
          {parseBoldAsterisk(para)}
        </p>
      ))}
    </div>
  );
}

async function getArtworkBySlug(slug: string): Promise<ArtworkRow | null> {
  const selectColumns =
    "id, slug, title, artist_display, url, image_id, museum, style_title, genre_title, medium_display, date_display, dimensions, description, death_year";

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

  return null;
}

export async function generateMetadata({ params }: ArtworkPageProps): Promise<Metadata> {
  const { slug } = await params;
  const artwork = await getArtworkBySlug(slug);

  if (!artwork) {
    return {
      title: "Artwork not found",
    };
  }

  const artist = artwork.artist_display ?? "Unknown artist";
  const title = `${artwork.title} by ${artist} — Free Download | Fine Art Free`;

  const { data: translation } = await supabase
    .from("artwork_translations")
    .select("seo_description")
    .eq("artwork_id", artwork.id)
    .eq("locale", "en")
    .single();

  const description =
    translation?.seo_description ||
    `${artwork.title} by ${artist}. Public domain artwork free to download.`;

  const imageUrl = artworkImageUrl(artwork);

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: absoluteUrl(`/artworks/${slug}`),
      languages: {
        ...buildArtworkLanguageAlternates(slug),
        "x-default": absoluteUrl(`/artworks/${slug}`),
      },
    },
    openGraph: {
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function ArtworkDetailPage({ params }: ArtworkPageProps) {
  const { slug } = await params;
  const artwork = await getArtworkBySlug(slug);

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

  const t = getT("en");
  const imageUrl = artworkDetailImageUrl(artwork);
  const maxDownloadHref = artworkOriginalUrl(artwork) || imageUrl;
  const artist = artwork.artist_display ?? "Unknown artist";
  const artistDeathYear = parseArtworkDeathYear(artwork.death_year);
  const artistSlug = artwork.artist_display?.trim() ? slugify(artwork.artist_display) : null;
  let artistArtworkCount = 0;
  let artistPortrait: string | null = null;

  if (artwork.artist_display?.trim() && artistSlug) {
    const countQuery = await supabase
      .from("artworks")
      .select("id", { count: "exact", head: true })
      .eq("artist_display", artwork.artist_display);
    artistArtworkCount = countQuery.count ?? 0;

    const { data: artistRow } = await supabase
      .from("artists")
      .select("image_url")
      .eq("slug", artistSlug)
      .maybeSingle();
    artistPortrait = (artistRow as { image_url?: string | null } | null)?.image_url ?? null;
  }

  const category = getCategoryBreadcrumb(artwork);
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    ...(category ? [category] : []),
    ...(artwork.artist_display?.trim()
      ? [{ label: artwork.artist_display.trim(), href: `/artists/${slugify(artwork.artist_display)}` }]
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

  const GENRE_TO_SLUG: Record<string, string> = {
    Landscape: "landscape",
    Marine: "marine",
    Portrait: "portrait",
    Religious: "religious",
    Architecture: "architecture",
    "Genre Scene": "genre-scene",
    Historical: "historical",
    Figurative: "figurative",
    "Decorative Art": "decorative-art",
    Interior: "interior",
    Botanical: "botanical",
    Abstract: "abstract",
    Animal: "animal",
    "Still Life": "still-life",
    Mythology: "mythology",
    Allegory: "allegory",
    Drawing: "drawing",
    Illustration: "illustration",
  };

  const genreSlug = artwork.genre_title ? GENRE_TO_SLUG[artwork.genre_title] ?? null : null;

  let relatedByGenre: Artwork[] = [];
  if (genreSlug && artwork.genre_title) {
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

  return (
    <article className="py-8">
      {imageUrl ? (
        <div
          aria-hidden
          className="art-backdrop"
          style={{
            backgroundImage: `linear-gradient(rgba(250,249,247,0.72), rgba(250,249,247,0.72)), url("${imageUrl}")`,
          }}
        />
      ) : null}
      <div className="mx-auto max-w-7xl px-5">
        <ArtworkJsonLd artwork={artwork} inLanguage="en" />
        <BreadcrumbJsonLd artwork={artwork} />

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <aside className="order-2 w-full lg:w-80">
            <div className="glass-surface space-y-4 rounded-2xl p-5 lg:sticky lg:top-6">
              <div>
                <h1 className="mb-2 text-lg font-semibold text-[#1a1a1a]">{artwork.title}</h1>
                <ArtistChip
                  name={artist}
                  href={artistSlug ? `/artists/${artistSlug}` : null}
                  portrait={artistPortrait}
                  fallbackArtwork={{ image_id: artwork.image_id, url: artwork.url }}
                />
              </div>

              <p className="text-sm text-[#6b6b6b]">{artistArtworkCount} Artworks</p>

              <div className="my-4 border-t border-[#e8e6e1]" />

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 rounded-lg glass-inset p-3">
                  <div>
                    <p className="text-sm font-medium text-[#1a1a1a]">Standard</p>
                    <p className="text-xs text-[#999]">JPG</p>
                  </div>
                  <DownloadButton imageUrl={imageUrl} filename={artwork.slug} variant="glass" />
                </div>

                <ProDownloadRow locale="en" isPro={isPro} downloadHref={maxDownloadHref} filename={artwork.slug} glass />
              </div>

              <div className="my-4 border-t border-[#e8e6e1]" />

              <div className="glass-inset rounded-lg p-3">
                <p className="text-xs leading-relaxed text-[#4a4a4a]">
                  {t.artworkSeoLine(artworkMediumKind(artwork.medium_display), artist, artwork.date_display)}
                </p>
                <details className="mt-2 text-xs text-[#4a4a4a]">
                  <summary className="inline-flex cursor-pointer list-none select-none items-center gap-1 text-[#6b6b6b] marker:content-none">
                    ⓘ Why is this image in the public domain?
                  </summary>
                  <div className="mt-3 rounded-lg bg-white p-4">
                    <p className="leading-relaxed text-[#4a4a4a]">
                      The Artist died in {artistDeathYear ?? "an unknown year"}, so this work is in
                      the public domain in its country of origin and other countries where the
                      copyright term is the Artist&apos;s life plus 70 years or fewer.
                    </p>
                  </div>
                </details>
              </div>

              <div className="my-4 border-t border-[#e8e6e1]" />

              <div className="glass-inset space-y-3 rounded-lg p-3">
                {artwork.style_title?.trim() ? (
                  <div>
                    <p className="text-xs text-[#999]">Style</p>
                    <Link
                      href={`/styles/${slugify(artwork.style_title)}`}
                      className="text-sm text-[#1a1a1a] underline"
                    >
                      {artwork.style_title}
                    </Link>
                  </div>
                ) : null}

                {artwork.medium_display?.trim() ? (
                  <div>
                    <p className="text-xs text-[#999]">Medium</p>
                    <p className="text-sm text-[#1a1a1a]">{artwork.medium_display}</p>
                  </div>
                ) : null}

                {artwork.date_display?.trim() ? (
                  <div>
                    <p className="text-xs text-[#999]">Date</p>
                    <p className="text-sm text-[#1a1a1a]">{artwork.date_display}</p>
                  </div>
                ) : null}

                {artwork.dimensions?.trim() ? (
                  <div>
                    <p className="text-xs text-[#999]">Dimensions</p>
                    <p className="text-sm text-[#1a1a1a]">{artwork.dimensions}</p>
                  </div>
                ) : null}

                {artwork.museum?.trim() ? (
                  <div>
                    <p className="text-xs text-[#999]">Museum</p>
                    <Link
                      href={`/museums/${slugify(artwork.museum)}`}
                      className="text-sm text-[#1a1a1a] underline"
                    >
                      {artwork.museum}
                    </Link>
                  </div>
                ) : null}
              </div>

              <div className="border-t border-[#e8e6e1]" />

              <div className="flex items-center gap-1.5">
                <span className="glass-chip inline-flex items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-1 text-[11px]">
                  <span aria-hidden>✓</span>
                  Public Domain
                </span>
                <span className="glass-chip inline-flex items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-1 text-[11px]">
                  <span aria-hidden>✓</span>
                  Free for Commercial Use
                </span>
              </div>
            </div>
          </aside>

          <ArtworkInsightsProvider artwork={artwork} locale="en" isPro={isPro}>
            <div className="order-1 flex-1 space-y-4">
              <div>
                {imageUrl ? (
                  <>
                    <div className="flex justify-center">
                      <div className="relative w-fit max-w-full">
                        <ArtworkZoomImage
                          src={imageUrl}
                          fullSrc={artworkOriginalUrl(artwork) || imageUrl}
                          alt={generateAltText(artwork)}
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
              <Breadcrumbs items={breadcrumbItems} currentPath={`/artworks/${artwork.slug}`} includeJsonLd={false} />

              {artwork.description?.trim() ? (
                <section className="max-w-2xl pt-4">
                  <h2 className="mb-5 text-2xl font-semibold tracking-tight text-[#1a1a1a]">
                    {artwork.title} — History &amp; Facts
                  </h2>
                  <div>
                    <ArtworkDescriptionFormatted description={artwork.description.trim()} />
                  </div>
                  {artistSlug && relatedArtworks.length === 0 ? (
                    <SectionCtaLink href={`/artists/${artistSlug}`}>Browse all</SectionCtaLink>
                  ) : null}
                </section>
              ) : null}
            </div>
          </ArtworkInsightsProvider>
        </div>

        {relatedArtworks.length > 0 && artistSlug ? (
          <section className="mt-10">
            <h2 className="mb-4 text-base font-semibold">More Artworks by {artist}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatedArtworks.map((item) => (
                <a key={item.id} href={`/artworks/${item.slug}`} className="group block">
                  <div className="overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.altText || item.title}
                      className="artwork-img artwork-img--related group-hover:scale-[1.03] transition-transform duration-300"
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
            <SectionCtaLink href={`/artists/${artistSlug}`}>Browse all</SectionCtaLink>
          </section>
        ) : null}

        {genreSlug && relatedByGenre.length > 0 ? (
          <section className="mt-12">
            <h2 className="mb-4 text-base font-semibold">More {artwork.genre_title} Art</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatedByGenre.map((item) => (
                <a key={item.id} href={`/artworks/${item.slug}`} className="group block">
                  <div className="overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.altText || item.title}
                      className="artwork-img artwork-img--related group-hover:scale-[1.03] transition-transform duration-300"
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
            <SectionCtaLink href={`/genres/${genreSlug}`}>Browse all</SectionCtaLink>
          </section>
        ) : null}
      </div>
    </article>
  );
}
