import type { Metadata } from "next";
import Link from "next/link";

import { RotatingProHero } from "@/components/RotatingProHero";

import { supabase } from "@/lib/supabase";
import { absoluteUrl, artworkImageUrl } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

export const revalidate = 86400;

const TITLE = "Public Domain Images for Commercial Use — 500,000+ Free Downloads | Fine Art Free";
const DESCRIPTION =
  "Download 500,000+ public domain images free for commercial use — paintings, fine art and vintage prints in high resolution. Sell prints, use on products. No attribution required, no fees.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: {
    canonical: absoluteUrl("/public-domain-images-for-commercial-use"),
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
  },
};

/** Artists with strong catalogs whose "{artist} high resolution download" queries the page targets. */
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

const USE_CASES = [
  { title: "Print-on-demand products", text: "T-shirts, mugs, phone cases — Etsy, Redbubble, Printful and more." },
  { title: "Wall art & framed prints", text: "Canvas prints, posters and gallery walls, printed at any size." },
  { title: "Book & album covers", text: "Commercial publishing, self-publishing, playlists and podcasts." },
  { title: "Packaging & branding", text: "Product labels, stationery and brand imagery with real provenance." },
  { title: "Editorial & blogs", text: "Articles, newsletters and social media — no image budget needed." },
  { title: "Web & app design", text: "Hero images, backgrounds and UI accents with timeless style." },
];

const CATEGORY_LINKS = [
  { label: "Botanical prints", href: "/genres/botanical" },
  { label: "Vintage posters", href: "/styles/art-nouveau" },
  { label: "Japanese woodblock", href: "/styles/ukiyo-e" },
  { label: "Landscape paintings", href: "/genres/landscape" },
  { label: "Still life", href: "/genres/still-life" },
  { label: "Portraits", href: "/genres/portrait" },
];

const FAQ = [
  {
    q: "Can I sell prints or products made with these images?",
    a: "Yes. Public domain artworks can be used commercially without restriction — including selling prints, canvases and products on Etsy, print-on-demand platforms or your own store.",
  },
  {
    q: "Do I need to credit the artist or museum?",
    a: "No attribution is required. Crediting the artist is a nice gesture, but public domain works carry no legal requirement to credit anyone.",
  },
  {
    q: "Can I edit, crop or remix the images?",
    a: "Freely. You can crop, recolor, combine and build derivative works — your derivatives are yours to use and sell.",
  },
  {
    q: "Why are these images free? Is it really legal?",
    a: "The artists died more than 70 years ago, so copyright has expired worldwide. Museums like the Met and the Rijksmuseum additionally release their scans under CC0 open-access policies.",
  },
  {
    q: "What resolution do the downloads have?",
    a: "Standard downloads are high resolution and free. Fine Art Pro unlocks the full-size original files — most in 4K or larger — for large-format printing.",
  },
];

function FaqJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
  );
}

export default async function CommercialUsePage() {
  const [{ data: artworkRows }, { data: artistRows }] = await Promise.all([
    supabase
      .from("artworks")
      .select("id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score, alt_text, death_year")
      .not("image_id", "is", null)
      // Commercial-safety filter: only artists dead 90+ years — the catalog holds a
      // few 20th-century works (Dalí d.1989, Hopper d.1967) that must never appear
      // on the page promising commercial use.
      .not("death_year", "is", null)
      .lt("death_year", 1932)
      // Bartholdi's Statue of Liberty watercolors top the score table but make weak
      // lead tiles for a paintings pitch.
      .not("artist_display", "ilike", "%bartholdi%")
      .order("score", { ascending: false })
      .limit(16),
    supabase
      .from("artists")
      .select("name, slug, image_url, artwork_count")
      .in("slug", FEATURED_ARTIST_SLUGS),
  ]);

  const artworks: Artwork[] = (artworkRows ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    slug: item.slug,
    artistName: item.artist_display ?? "Unknown artist",
    artistDisplay: item.artist_display ?? undefined,
    imageUrl: artworkImageUrl({ url: item.url ?? null, image_id: item.image_id }),
    imageId: item.image_id,
    museum: item.museum,
    styleTitle: item.style_title,
    genreTitle: item.genre_title,
    score: item.score,
    url: item.url,
    styleSlug: "",
    styleName: item.style_title ?? "",
    sourceUrl: item.url ?? undefined,
    altText: item.alt_text ?? null,
  }));

  const artistsBySlug = new Map((artistRows ?? []).map((a) => [a.slug, a]));
  const featuredArtists = FEATURED_ARTIST_SLUGS.map((slug) => artistsBySlug.get(slug)).filter(
    (a): a is NonNullable<typeof a> => Boolean(a)
  );

  return (
    <div>
      <FaqJsonLd />

      <section className="relative w-full bg-[#1a1a1a] py-20">
        <div className="relative z-10 mx-auto flex max-w-7xl items-center gap-12 px-5">
          <div className="min-w-0 flex-1 text-left">
          <p className="mb-5 text-[13px] uppercase tracking-[0.08em] text-[#a3a3a3]">
            Public domain · Commercial use
          </p>
          <h1 className="max-w-3xl text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight text-white">
            Public Domain Images for Commercial Use
          </h1>
          <p className="mt-5 max-w-2xl text-base sm:text-lg leading-relaxed text-white/85">
            Browse 500,000+ public domain paintings, fine art images and vintage prints from the
            world&apos;s great museums — every file free to download in high resolution for personal
            and commercial use. No attribution, no license fees, no account.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {["Public Domain", "Commercial Use", "No Attribution", "High Resolution"].map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-white/15 px-3 py-1 text-xs text-white backdrop-blur"
              >
                <span aria-hidden>✓</span>
                {badge}
              </span>
            ))}
          </div>
          <form action="/search" method="get" className="mt-8 max-w-xl">
            <div className="flex items-center rounded-full bg-white/95 px-5 py-3">
              <input
                type="text"
                name="q"
                placeholder="Search 500,000+ artworks by artist or keyword"
                className="w-full bg-transparent text-[15px] text-[#1a1a1a] placeholder:text-[#6b6b6b] focus:outline-none"
                aria-label="Search artworks by artist or keyword"
              />
              <button type="submit" className="pl-2 text-2xl text-[#1a1a1a]" aria-label="Search">
                ⌕
              </button>
            </div>
          </form>
          <p className="mt-4 text-sm text-white/80">
            Popular:{" "}
            <Link href="/artists/vincent-van-gogh" className="underline hover:text-white">van gogh</Link>
            {" · "}
            <Link href="/artworks/water-lilies-claude-monet" className="underline hover:text-white">monet water lilies</Link>
            {" · "}
            <Link href="/genres/botanical" className="underline hover:text-white">botanical prints</Link>
            {" · "}
            <Link href="/styles/ukiyo-e" className="underline hover:text-white">japanese woodblock</Link>
          </p>
          </div>
          <div className="hidden w-[340px] shrink-0 lg:block xl:w-[380px]">
            <div className="overflow-hidden rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
              <RotatingProHero alt="Famous public domain paintings, free for commercial use" />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5">
        <section className="py-10">
          <h2 className="mb-5 text-2xl sm:text-3xl font-semibold tracking-tight text-[#1a1a1a]">What you can make with them</h2>
          <div className="grid max-w-5xl grid-cols-1 gap-x-12 gap-y-6 sm:grid-cols-2">
            {USE_CASES.map((useCase, i) => {
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
          <h2 className="mb-3 text-2xl sm:text-3xl font-semibold tracking-tight text-[#1a1a1a]">
            Download famous paintings in high resolution
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-[#4a4a4a]">
            Every artwork comes as a high-resolution download, most in 4K or larger, scanned from
            museum originals. Download Van Gogh&apos;s landscapes, Monet&apos;s Water Lilies,
            Vermeer&apos;s portraits, Rembrandt, Goya, Renoir, Caravaggio and Turner in print
            quality — free.
          </p>
          {featuredArtists.length ? (
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-6">
              {featuredArtists.map((artist) => (
                <Link
                  key={artist.slug}
                  href={`/artists/${artist.slug}`}
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
          <h2 className="mb-5 text-2xl sm:text-3xl font-semibold tracking-tight text-[#1a1a1a]">
            Featured free commercial-use artworks
          </h2>
          <div className="pd-marquee -mx-5">
            <div className="pd-marquee-track px-5">
              {[...artworks, ...artworks].map((artwork, i) => (
                <Link
                  key={`${artwork.id}-${i}`}
                  href={`/artworks/${artwork.slug}`}
                  className="group block w-[200px] shrink-0"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={artwork.imageUrl}
                    alt={artwork.altText || `${artwork.title} by ${artwork.artistDisplay}`}
                    className="aspect-[4/5] w-full rounded-lg object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                    decoding="async"
                  />
                  <p className="mt-2 truncate text-[13px] font-medium text-[#1a1a1a]">
                    {artwork.title}
                  </p>
                  <p className="truncate text-[12px] text-[#6b6b6b]">{artwork.artistDisplay}</p>
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-6">
            <Link
              href="/artworks"
              className="inline-flex items-center gap-1 rounded-lg bg-[#1a1a1a] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#333]"
            >
              Browse all 500,000+ artworks
              <span aria-hidden>→</span>
            </Link>
          </div>
        </section>

        <section className="py-6">
          <h2 className="mb-3 text-2xl sm:text-3xl font-semibold tracking-tight text-[#1a1a1a]">Print-ready quality</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-[#4a4a4a]">
            Files are large enough for real printing — canvas prints, framed wall art, posters and
            print-on-demand products. Free downloads cover most uses; Fine Art Pro unlocks
            full-size 4K originals for large-format printing.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-10 py-10 md:grid-cols-2 md:items-start">
          <div>
            <h2 className="mb-4 text-2xl sm:text-3xl font-semibold tracking-tight text-[#1a1a1a]">
              Why these images are free
            </h2>
            <p className="text-sm leading-relaxed text-[#4a4a4a]">
              Copyright has expired: the artists died more than 70 years ago, placing their work
              in the public domain worldwide. On top of that, the Met, the Rijksmuseum and other
              museums release their high-resolution scans under CC0 open access.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#4a4a4a]">
              The one caveat worth knowing: trademarks or recognizable living persons within an
              image can carry separate rights — rare in classic art, but worth knowing.
            </p>
          </div>
          <div className="border-l-2 border-[#d8d5cd] pl-6">
            <p className="text-3xl font-semibold tracking-tight text-[#1a1a1a]">4K</p>
            <p className="mb-4 text-sm text-[#6b6b6b]">original files, museum-grade scans</p>
            <p className="text-3xl font-semibold tracking-tight text-[#1a1a1a]">500,000+</p>
            <p className="mb-4 text-sm text-[#6b6b6b]">artworks, five centuries of art</p>
            <p className="text-3xl font-semibold tracking-tight text-[#1a1a1a]">$0</p>
            <p className="text-sm text-[#6b6b6b]">no license fees, no attribution — JPG, ready for POD</p>
          </div>
        </section>

        <section className="py-6">
          <h2 className="mb-4 text-2xl sm:text-3xl font-semibold tracking-tight text-[#1a1a1a]">Popular categories</h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_LINKS.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="rounded-full border border-[#e8e6e1] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] px-4 py-2 text-sm text-[#1a1a1a] transition-colors hover:bg-white/60"
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="max-w-3xl py-6">
          <p className="text-sm leading-relaxed text-[#4a4a4a]">
            Whether you need public domain paintings for commercial use, a vintage painting
            download for a client project, or royalty-free fine art for products, every image in
            this collection is free of copyright and free of charge. The catalog spans five
            centuries of art history — from old master paintings to Impressionist landscapes and
            Japanese woodblock prints — all available as high-resolution art for printing,
            digital design and resale.
          </p>
        </section>

        <section className="max-w-3xl py-6">
          <h2 className="mb-4 text-2xl sm:text-3xl font-semibold tracking-tight text-[#1a1a1a]">Frequently asked questions</h2>
          <div className="space-y-3">
            {FAQ.map((item) => (
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
            <p className="text-xl font-semibold text-white">Start downloading — free, forever</p>
            <p className="mt-2 text-sm text-white/90">
              No account needed · 4K originals and unlimited downloads with Fine Art Pro
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/artworks"
                className="rounded-md bg-white px-5 py-2.5 text-sm font-medium text-[#1a1a1a] transition hover:bg-white/90"
              >
                Browse free images
              </Link>
              <Link
                href="/fineart-pro"
                className="rounded-md border border-white/70 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Fine Art Pro
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
