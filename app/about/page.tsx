import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Fine Art Free — Public Domain Art Downloads",
  description:
    "Fine Art Free aggregates public domain artwork from the world's top museums. All artworks are free to download and use for personal and commercial purposes.",
};

export default function AboutPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold mb-8">About Fine Art Free</h1>

      <section className="prose prose-sm text-[#4a4a4a] space-y-6">
        <p>
          Fine Art Free is a curated collection of over 72,000 public domain artworks sourced from the world&apos;s
          leading museums and cultural institutions. Our mission is to make classic art freely accessible to everyone
          — designers, educators, artists, and anyone who loves great paintings.
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
