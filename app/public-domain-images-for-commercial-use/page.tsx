import type { Metadata } from "next";
import Link from "next/link";

import { ArtistChip } from "@/components/ArtistChip";
import { ArtworkGrid } from "@/components/ArtworkGrid";
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
      .select("id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score, alt_text")
      .not("image_id", "is", null)
      .order("score", { ascending: false })
      .limit(12),
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-bg-moonrise.svg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          fetchPriority="high"
          decoding="sync"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative z-10 mx-auto max-w-4xl px-5 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
            Public Domain Images for Commercial Use
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-white">
            Browse 500,000+ public domain paintings, fine art images and vintage prints from the
            world&apos;s great museums — every file free to download in high resolution for personal
            and commercial use. No attribution, no license fees, no account.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
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
          <form action="/search" method="get" className="mx-auto mt-8 max-w-xl">
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
      </section>

      <div className="mx-auto max-w-7xl px-5">
        <section className="py-10">
          <h2 className="mb-5 text-xl font-semibold text-[#1a1a1a]">What you can make with them</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map((useCase) => (
              <div key={useCase.title} className="glass-inset rounded-lg p-4">
                <p className="text-sm font-semibold text-[#1a1a1a]">{useCase.title}</p>
                <p className="mt-1 text-sm text-[#6b6b6b]">{useCase.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-6">
          <h2 className="mb-3 text-xl font-semibold text-[#1a1a1a]">
            Download famous paintings in high resolution
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-[#4a4a4a]">
            Every artwork comes as a high-resolution download, most in 4K or larger, scanned from
            museum originals. Download Van Gogh&apos;s landscapes, Monet&apos;s Water Lilies,
            Vermeer&apos;s portraits, Rembrandt, Goya, Renoir, Caravaggio and Turner in print
            quality — free.
          </p>
          {featuredArtists.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {featuredArtists.map((artist) => (
                <ArtistChip
                  key={artist.slug}
                  name={artist.name}
                  href={`/artists/${artist.slug}`}
                  portrait={artist.image_url}
                />
              ))}
            </div>
          ) : null}
        </section>

        <section className="py-8">
          <h2 className="mb-5 text-xl font-semibold text-[#1a1a1a]">
            Featured free commercial-use artworks
          </h2>
          <ArtworkGrid artworks={artworks} />
          <div className="mt-6">
            <Link
              href="/artworks"
              className="inline-flex items-center gap-1 rounded-md bg-gradient-to-br from-[#4CAF50] to-[#1e9e57] px-5 py-2.5 text-sm font-medium text-white shadow-[0_6px_18px_rgba(76,175,80,0.4)] transition hover:brightness-110"
            >
              Browse all 500,000+ artworks
              <span aria-hidden>→</span>
            </Link>
          </div>
        </section>

        <section className="py-6">
          <h2 className="mb-3 text-xl font-semibold text-[#1a1a1a]">Print-ready quality</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-[#4a4a4a]">
            Files are large enough for real printing — canvas prints, framed wall art, posters and
            print-on-demand products. Free downloads cover most uses; Fine Art Pro unlocks
            full-size 4K originals for large-format printing.
          </p>
          <div className="mt-5 grid max-w-xl grid-cols-3 gap-3">
            {[
              ["4K", "original files"],
              ["Museum", "grade scans"],
              ["JPG", "ready for POD"],
            ].map(([big, small]) => (
              <div key={big} className="glass-inset rounded-lg p-4 text-center">
                <p className="text-lg font-semibold text-[#1a1a1a]">{big}</p>
                <p className="text-xs text-[#6b6b6b]">{small}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-6">
          <h2 className="mb-5 text-xl font-semibold text-[#1a1a1a]">Why these images are free</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="glass-inset rounded-lg p-4">
              <p className="text-sm font-semibold text-[#1a1a1a]">Copyright has expired</p>
              <p className="mt-1 text-sm text-[#6b6b6b]">
                The artists died more than 70 years ago, placing their work in the public domain
                worldwide.
              </p>
            </div>
            <div className="glass-inset rounded-lg p-4">
              <p className="text-sm font-semibold text-[#1a1a1a]">Museum open access</p>
              <p className="mt-1 text-sm text-[#6b6b6b]">
                The Met, the Rijksmuseum and other museums release their high-resolution scans
                under CC0.
              </p>
            </div>
            <div className="glass-inset rounded-lg p-4">
              <p className="text-sm font-semibold text-[#1a1a1a]">The one caveat</p>
              <p className="mt-1 text-sm text-[#6b6b6b]">
                Trademarks or recognizable living persons within an image can carry separate
                rights — rare in classic art, but worth knowing.
              </p>
            </div>
          </div>
        </section>

        <section className="py-6">
          <h2 className="mb-4 text-xl font-semibold text-[#1a1a1a]">Popular categories</h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_LINKS.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="glass-inset rounded-full px-4 py-2 text-sm text-[#1a1a1a] transition-colors hover:bg-white/60"
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
          <h2 className="mb-4 text-xl font-semibold text-[#1a1a1a]">Frequently asked questions</h2>
          <div className="space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="glass-inset rounded-lg p-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-[#1a1a1a] marker:content-none">
                  {item.q}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-[#4a4a4a]">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="py-10">
          <div className="rounded-2xl bg-gradient-to-br from-[#4CAF50] to-[#1e9e57] px-6 py-10 text-center shadow-[0_6px_18px_rgba(76,175,80,0.4)]">
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
