import type { Metadata } from "next";

import { buildEnOnlyLanguageAlternates } from "@/lib/hreflang-paths";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About Fine Art Free — Public Domain Art Downloads",
  description:
    "Fine Art Free aggregates public domain artwork from the world's top museums. All artworks are free to download and use for personal and commercial purposes.",
  alternates: {
    canonical: absoluteUrl("/about"),
    languages: buildEnOnlyLanguageAlternates("/about"),
  },
};

/**
 * University libraries that list Fine Art Free in their art/image research guides.
 * Every entry is verified before being added here — either a live dofollow link
 * (most), or a listing the library confirmed to us directly (e.g. Tampere, whose
 * Databases A-Z is a JS-rendered SpringShare list). This is the page's strongest
 * trust signal, so it must never contain an unverified claim.
 * Adding a new win is one line plus a logo in /images/university-logos.
 */
const LISTED_BY = [
  { name: "Durham University", country: "UK", file: "durham.png", href: "https://libguides.durham.ac.uk/visualarts/databases" },
  { name: "the University of York", country: "UK", file: "york.png", href: "https://subjectguides.york.ac.uk/historyofart/images" },
  { name: "the University of Leeds", country: "UK", file: "leeds.svg", href: "https://library.leeds.ac.uk/subjects/1156" },
  { name: "the University of Waterloo", country: "Canada", file: "waterloo.png", href: "https://subjectguides.uwaterloo.ca/az/fine-art-free" },
  { name: "the University of Alberta", country: "Canada", file: "alberta.png", href: "https://guides.library.ualberta.ca/c.php?g=332470&p=5354482" },
  { name: "UCLA", country: "USA", file: "ucla.svg", href: "https://guides.library.ucla.edu/images/finding" },
  { name: "Vanderbilt University", country: "USA", file: "vanderbilt.svg", href: "https://researchguides.library.vanderbilt.edu/c.php?g=68837&p=446111" },
  { name: "Skidmore College", country: "USA", file: "skidmore.png", href: "https://libguides.skidmore.edu/art/images" },
  { name: "the University of Seville", country: "Spain", file: "seville.png", href: "https://guiasbus.us.es/bellasartes/sitiosweb" },
  { name: "the National and University Library of Iceland", country: "Iceland", file: "landsbokasafn.svg", href: "https://leidarvisar.is/c.php?g=710927&p=6518871" },
  { name: "Tampere University", country: "Finland", file: "tampere.svg", href: "https://libguides.tuni.fi/az/databases?q=Fine%20Art%20Free" },
  { name: "Middlesex University", country: "UK", file: "middlesex.svg", href: "https://libguides.mdx.ac.uk/c.php?g=711009&p=5131361" },
  { name: "Ontario Tech University", country: "Canada", file: "ontario-tech.svg", href: "https://guides.library.ontariotechu.ca/open-images-media" },
  // Listed in the A-Z Databases (dofollow link to fineartfree.com, verified live); no logo yet,
  // so it shows in the text credit only — the logo bar skips entries without a `file`.
  { name: "the Glasgow School of Art", country: "UK", file: null, href: "https://gsa.libguides.com/az.php?q=Fine%20Art%20Free" },
  // Indexable + dofollow (robots: noarchive only) on the Art & Art History "Images" guide — a real SEO link, not just credibility.
  { name: "Carleton College", country: "USA", file: null, href: "https://gouldguides.carleton.edu/art/images" },
  // Library e-resources page, listed between Europeana and Getty Research; dofollow (no rel=nofollow), verified live. No logo yet → text credit only.
  { name: "Oslo National Academy of the Arts", country: "Norway", file: null, href: "https://khio.no/en/about/the-library" },
] as const;

export default function AboutPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold mb-8">About Fine Art Free</h1>

      <section className="prose prose-sm text-[#4a4a4a] space-y-6">
        <p>
          Fine Art Free is a curated collection of over 500,000 public domain artworks sourced from the world&apos;s
          leading museums and cultural institutions. Our mission is to make classic art freely accessible to everyone
          — designers, educators, artists, students, and anyone who loves great paintings.
        </p>

        <h2 className="text-lg font-semibold text-[#1a1a1a]">Who runs Fine Art Free</h2>
        <p>
          Fine Art Free is an independent project founded and maintained by Pavel Mazuelas, a professor in the
          Master&apos;s in Digital Marketing at the Universidad Complutense de Madrid. It grew from a simple
          observation: the world&apos;s great museums have released hundreds of thousands of artworks into the public
          domain, but they sit scattered across dozens of separate databases. Fine Art Free brings them together in one
          place, in high resolution and free to download — with no account and no paywall.
        </p>
        <p>
          The project is independent and not affiliated with any museum or institution. If you have a question, a
          correction, or a suggestion, you can reach us any time through our{" "}
          <a href="/contact" className="underline hover:text-[#1a1a1a]">contact page</a> — we read and reply to every
          message.
        </p>

        <h2 className="text-lg font-semibold text-[#1a1a1a]">Recommended by university libraries</h2>
        <p>
          Fine Art Free is included as a recommended resource in the art and image research guides of
          universities and colleges around the world — among them{" "}
          {LISTED_BY.map((u, i) => (
            <span key={u.name}>
              {i > 0 ? (i === LISTED_BY.length - 1 ? " and " : ", ") : ""}
              <a
                href={u.href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[#1a1a1a]"
              >
                {u.name}
              </a>{" "}
              ({u.country})
            </span>
          ))}
          .
        </p>

        <div className="not-prose flex flex-wrap items-center gap-x-8 gap-y-5 py-1">
          {LISTED_BY.filter((u) => u.file).map((u) => (
            <a key={u.name} href={u.href} target="_blank" rel="noopener noreferrer" aria-label={u.name}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/images/university-logos/${u.file}`}
                alt={u.name}
                className="h-9 w-auto opacity-70 transition hover:opacity-100"
                loading="lazy"
              />
            </a>
          ))}
        </div>

        <p>
          Fine Art Free is also indexed in{" "}
          <a
            href="https://dbis.ur.de/resources/107038"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[#1a1a1a]"
          >
            DBIS (Datenbank-Infosystem)
          </a>
          , a scholarly database directory maintained by the University of Regensburg and used by over 400 academic
          institutions.
        </p>

        <h2 className="text-lg font-semibold text-[#1a1a1a]">Are these images really free to use?</h2>
        <p>
          Yes. In recent years, major museums and libraries around the world — including the Rijksmuseum, the
          Metropolitan Museum of Art, the Art Institute of Chicago, and many others — have adopted open access
          policies. They have designated public domain works in their collections with Creative Commons Zero (CC0)
          licenses, making them freely available for any purpose including commercial use.
        </p>
        <p>
          We aggregate the best of these images in one place to make them easy to discover and download. Permission is
          granted to download, share and reuse all images on this site with no restrictions attached.
        </p>

        <h2 className="text-lg font-semibold text-[#1a1a1a]">What is public domain art?</h2>
        <p>
          A work enters the public domain when its copyright expires — typically 70 years after the death of the creator
          in most countries. All artworks on Fine Art Free were created by artists who died more than 70 years ago,
          placing them firmly in the public domain.
        </p>
        <p>
          The European Union&apos;s Directive on Copyright in the Digital Single Market (Article 14) further states
          that faithful reproductions of public domain visual artworks cannot be subject to new copyright. This is
          consistent with the U.S. ruling in Bridgeman Art Library v. Corel Corp., which established that exact
          photographic reproductions of public domain works are themselves in the public domain.
        </p>

        <h2 className="text-lg font-semibold text-[#1a1a1a]">Can I use these images commercially?</h2>
        <p>
          Yes. All images on Fine Art Free may be used freely for personal and commercial projects — including print,
          digital design, advertising, merchandise, editorial, and any other purpose. No attribution is required,
          though crediting the original museum is always appreciated.
        </p>

        <h2 className="text-lg font-semibold text-[#1a1a1a]">Image sources</h2>
        <p>
          Artworks are sourced from museum open access programs and cultural institution databases including the
          Rijksmuseum, Harvard Art Museums, the Art Institute of Chicago, the Metropolitan Museum of Art, the National
          Gallery of Art, and many others. Some images are sourced from Wikimedia Commons under their public domain
          image policy.
        </p>
      </section>
    </main>
  );
}
