import Link from "next/link";

import { MuseumLogoStrip } from "@/components/MuseumLogoStrip";
import { RotatingProHero } from "@/components/RotatingProHero";

import { supabase } from "@/lib/supabase";
import { artworkImageUrl } from "@/lib/utils";
import {
  localePath,
  artistDetailPath,
  artworkDetailPath,
  type SiteLocale,
} from "@/lib/locale-routes";
import { TITLE_COLUMN, type CommercialUseCopy } from "@/lib/commercial-use-landing";

const FEATURED_ARTIST_SLUGS = [
  "vincent-van-gogh",
  "claude-monet",
  "johannes-vermeer",
  "rembrandt-van-rijn",
  "francisco-de-goya",
  "pierre-auguste-renoir",
  "caravaggio",
  "joseph-mallord-william-turner",
];

const FEATURED_ARTWORK_SLUGS = [
  "the-kiss",
  "starry-night",
  "water-lilies-nympheas-claude-monet",
  "the-birth-of-venus-sandro-botticelli",
  "girl-with-a-pearl-earring",
  "sunflowers-vincent-van-gogh",
  "a-sunday-afternoon-on-the-island-of-la-grande-jatte-georges-seurat",
  "luncheon-of-the-boating-party-pierre-auguste-renoir",
  "the-night-watch-rembrandt-van-rijn",
  "cafe-terrace-at-night-vincent-van-gogh",
  "bal-du-moulin-de-la-galette-pierre-auguste-renoir",
  "impression-sunrise-claude-monet",
  "almond-blossom-vincent-van-gogh",
  "the-fighting-temeraire-joseph-mallord-william-turner",
  "wanderer-above-the-sea-of-fog",
  "bedroom-in-arles-vincent-van-gogh",
];

const CATEGORY_TARGETS: { hub: "genres" | "styles"; slug: string }[] = [
  { hub: "genres", slug: "botanical" },
  { hub: "styles", slug: "art-nouveau" },
  { hub: "styles", slug: "ukiyo-e" },
  { hub: "genres", slug: "landscape" },
  { hub: "genres", slug: "still-life" },
  { hub: "genres", slug: "portrait" },
];

function FaqJsonLd({ faq }: { faq: CommercialUseCopy["faq"] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
  );
}

export async function CommercialUseLanding({
  locale,
  copy,
}: {
  locale: SiteLocale;
  copy: CommercialUseCopy;
}) {
  const titleCol = TITLE_COLUMN[locale];
  const cols = [
    "id",
    "title",
    "slug",
    "artist_display",
    "image_id",
    "url",
    "museum",
    "style_title",
    "genre_title",
    "score",
    "alt_text",
    "death_year",
  ];
  if (titleCol !== "title") cols.splice(2, 0, titleCol);
  const SELECT = cols.join(", ");

  const [{ data: curatedRows }, { data: fallbackRows }, { data: artistRows }] = await Promise.all([
    supabase.from("artworks").select(SELECT).is("object_type", null).in("slug", FEATURED_ARTWORK_SLUGS),
    supabase
      .from("artworks")
      .select(SELECT)
      .is("object_type", null)
      .not("image_id", "is", null)
      .not("death_year", "is", null)
      .lt("death_year", 1932)
      .not("artist_display", "ilike", "%bartholdi%")
      .order("score", { ascending: false })
      .limit(24),
    supabase.from("artists").select("name, slug, image_url, artwork_count").in("slug", FEATURED_ARTIST_SLUGS),
  ]);

  type Row = Record<string, unknown> & { slug: string };
  const curated = (curatedRows ?? []) as unknown as Row[];
  const fallback = (fallbackRows ?? []) as unknown as Row[];

  const curatedBySlug = new Map<string, Row>();
  for (const r of curated) if (r.slug) curatedBySlug.set(r.slug, r);
  const artworkRows: Row[] = [];
  const seenSlugs = new Set<string>();
  for (const slug of FEATURED_ARTWORK_SLUGS) {
    const r = curatedBySlug.get(slug);
    if (r) {
      artworkRows.push(r);
      seenSlugs.add(slug);
    }
  }
  for (const r of fallback) {
    if (artworkRows.length >= 16) break;
    if (r.slug && !seenSlugs.has(r.slug)) {
      artworkRows.push(r);
      seenSlugs.add(r.slug);
    }
  }

  const artworks = artworkRows.map((item) => {
    const localizedTitle = (item[titleCol] as string | null) || (item.title as string);
    const artist = (item.artist_display as string | null) ?? copy.unknownArtist;
    return {
      id: item.id as string,
      title: localizedTitle,
      slug: item.slug,
      artist,
      imageUrl: artworkImageUrl({ url: (item.url as string) ?? null, image_id: item.image_id as string }),
    };
  });

  const artistsBySlug = new Map((artistRows ?? []).map((a) => [a.slug, a]));
  const featuredArtists = FEATURED_ARTIST_SLUGS.map((slug) => artistsBySlug.get(slug)).filter(
    (a): a is NonNullable<typeof a> => Boolean(a)
  );

  const proPath = locale === "en" ? "/fineart-pro" : `/${locale}/fineart-pro`;
  const popular = [
    { href: artistDetailPath(locale, "vincent-van-gogh"), label: copy.popular[0] },
    { href: artworkDetailPath(locale, "water-lilies-claude-monet"), label: copy.popular[1] },
    { href: localePath(locale, "genres", "/botanical"), label: copy.popular[2] },
    { href: localePath(locale, "styles", "/ukiyo-e"), label: copy.popular[3] },
  ];

  return (
    <div>
      <FaqJsonLd faq={copy.faq} />

      <section className="relative w-full overflow-hidden bg-[#080b16] py-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero-caspar.jpg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#080b16]/90 via-[#080b16]/65 to-[#080b16]/40"
          aria-hidden
        />
        <div className="relative z-10 mx-auto flex max-w-7xl items-center gap-12 px-5">
          <div className="min-w-0 flex-1 text-left">
            <p className="mb-5 text-[13px] uppercase tracking-[0.08em] text-[#a3a3a3]">{copy.eyebrow}</p>
            <h1 className="max-w-3xl text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight text-white">
              {copy.h1}
            </h1>
            <p className="mt-5 max-w-2xl text-base sm:text-lg leading-relaxed text-white/85">{copy.subhead}</p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {copy.badges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-white/15 px-3 py-1 text-xs text-white backdrop-blur"
                >
                  <span aria-hidden>✓</span>
                  {badge}
                </span>
              ))}
            </div>
            <form action={localePath(locale, "search")} method="get" className="mt-8 max-w-xl">
              <div className="flex items-center rounded-full border border-white/25 bg-white/10 px-5 py-3 backdrop-blur-md">
                <input
                  type="text"
                  name="q"
                  placeholder={copy.searchPlaceholder}
                  className="w-full bg-transparent text-[15px] text-white placeholder:text-white/55 focus:outline-none"
                  aria-label={copy.searchAria}
                />
                <button type="submit" className="pl-2 text-2xl text-white" aria-label={copy.searchButtonAria}>
                  ⌕
                </button>
              </div>
            </form>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-white/70">{copy.popularLabel}</span>
              {popular.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-sm text-white/90 backdrop-blur-md transition hover:border-white/40 hover:bg-white/20 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="hidden w-[340px] shrink-0 lg:block xl:w-[380px]">
            <div className="overflow-hidden rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
              <RotatingProHero alt={copy.proHeroAlt} />
            </div>
          </div>
        </div>

        <div className="relative z-10 mx-auto mt-14 max-w-7xl px-5">
          <MuseumLogoStrip />
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5">
        <section className="py-10">
          <h2 className="mb-5 text-2xl sm:text-3xl font-semibold tracking-tight text-[#1a1a1a]">{copy.useCasesH2}</h2>
          <div className="grid max-w-5xl grid-cols-1 gap-x-12 gap-y-6 sm:grid-cols-2">
            {copy.useCases.map((useCase, i) => {
              const thumb = artworks[i % Math.max(artworks.length, 1)];
              return (
                <div key={useCase.title} className="flex items-start gap-4">
                  {thumb ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={thumb.imageUrl}
                      alt=""
                      aria-hidden
                      className="h-14 w-14 shrink-0 rounded-lg object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : null}
                  <div>
                    <p className="text-sm font-medium text-[#1a1a1a]">{useCase.title}</p>
                    <p className="mt-0.5 text-sm text-[#6b6b6b]">{useCase.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="py-6">
          <h2 className="mb-3 text-2xl sm:text-3xl font-semibold tracking-tight text-[#1a1a1a]">{copy.downloadH2}</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-[#4a4a4a]">{copy.downloadP}</p>
          {featuredArtists.length ? (
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-6">
              {featuredArtists.map((artist) => (
                <Link
                  key={artist.slug}
                  href={artistDetailPath(locale, artist.slug)}
                  className="group flex w-24 flex-col items-center text-center"
                >
                  <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#e8e4de] shadow-[0_2px_10px_rgba(0,0,0,0.08)] transition-transform duration-300 group-hover:scale-105">
                    {artist.image_url?.trim() ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={artworkImageUrl({ url: null, image_id: artist.image_url.trim() }, { width: 160, quality: 85 })}
                        alt={artist.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="text-lg font-semibold text-[#b8b0a6]" aria-hidden>
                        {artist.name.charAt(0)}
                      </span>
                    )}
                  </span>
                  <span className="mt-2 text-[13px] leading-tight text-[#4a4a4a] transition-colors group-hover:text-[#1a1a1a]">
                    {artist.name}
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        <section className="py-8">
          <h2 className="mb-5 text-2xl sm:text-3xl font-semibold tracking-tight text-[#1a1a1a]">{copy.featuredH2}</h2>
          <div className="pd-marquee -mx-5">
            <div className="pd-marquee-track px-5">
              {[...artworks, ...artworks].map((artwork, i) => (
                <Link
                  key={`${artwork.id}-${i}`}
                  href={artworkDetailPath(locale, artwork.slug)}
                  className="group block w-[200px] shrink-0"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={artwork.imageUrl}
                    alt={`${artwork.title}${copy.altConnector}${artwork.artist}`}
                    className="aspect-[4/5] w-full rounded-lg object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                    decoding="async"
                  />
                  <p className="mt-2 truncate text-[13px] font-medium text-[#1a1a1a]">{artwork.title}</p>
                  <p className="truncate text-[12px] text-[#6b6b6b]">{artwork.artist}</p>
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-6">
            <Link
              href={localePath(locale, "artworks")}
              className="inline-flex items-center gap-1 rounded-lg bg-[#1a1a1a] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#333]"
            >
              {copy.browseAllCta}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </section>

        <section className="py-6">
          <h2 className="mb-3 text-2xl sm:text-3xl font-semibold tracking-tight text-[#1a1a1a]">{copy.printH2}</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-[#4a4a4a]">{copy.printP}</p>
        </section>

        <section className="grid grid-cols-1 gap-10 py-10 md:grid-cols-2 md:items-start">
          <div>
            <h2 className="mb-4 text-2xl sm:text-3xl font-semibold tracking-tight text-[#1a1a1a]">{copy.whyH2}</h2>
            <p className="text-sm leading-relaxed text-[#4a4a4a]">{copy.whyP1}</p>
            <p className="mt-3 text-sm leading-relaxed text-[#4a4a4a]">{copy.whyP2}</p>
          </div>
          <div className="border-l-2 border-[#d8d5cd] pl-6">
            <p className="text-3xl font-semibold tracking-tight text-[#1a1a1a]">{copy.statK1}</p>
            <p className="mb-4 text-sm text-[#6b6b6b]">{copy.statK1Sub}</p>
            <p className="text-3xl font-semibold tracking-tight text-[#1a1a1a]">{copy.statK2}</p>
            <p className="mb-4 text-sm text-[#6b6b6b]">{copy.statK2Sub}</p>
            <p className="text-3xl font-semibold tracking-tight text-[#1a1a1a]">{copy.statK3}</p>
            <p className="text-sm text-[#6b6b6b]">{copy.statK3Sub}</p>
          </div>
        </section>

        <section className="py-6">
          <h2 className="mb-4 text-2xl sm:text-3xl font-semibold tracking-tight text-[#1a1a1a]">{copy.categoriesH2}</h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_TARGETS.map((cat, i) => (
              <Link
                key={cat.slug}
                href={localePath(locale, cat.hub, `/${cat.slug}`)}
                className="rounded-full border border-[#e8e6e1] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] px-4 py-2 text-sm text-[#1a1a1a] transition-colors hover:bg-white/60"
              >
                {copy.categoryLabels[i]}
              </Link>
            ))}
          </div>
        </section>

        <section className="max-w-3xl py-6">
          <p className="text-sm leading-relaxed text-[#4a4a4a]">{copy.closingP}</p>
        </section>

        <section className="max-w-3xl py-6">
          <h2 className="mb-4 text-2xl sm:text-3xl font-semibold tracking-tight text-[#1a1a1a]">{copy.faqH2}</h2>
          <div className="space-y-3">
            {copy.faq.map((item) => (
              <details key={item.q} className="rounded-lg border border-[#e8e6e1] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-[#1a1a1a] marker:content-none">
                  {item.q}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-[#4a4a4a]">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="py-10">
          <div className="rounded-2xl bg-[#1a1a1a] px-6 py-10 text-center">
            <p className="text-xl font-semibold text-white">{copy.ctaH}</p>
            <p className="mt-2 text-sm text-white/90">{copy.ctaSub}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href={localePath(locale, "artworks")}
                className="rounded-md bg-white px-5 py-2.5 text-sm font-medium text-[#1a1a1a] transition hover:bg-white/90"
              >
                {copy.ctaBrowse}
              </Link>
              <Link
                href={proPath}
                className="rounded-md border border-white/70 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
              >
                {copy.ctaPro}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
