import type { Metadata } from "next";

import { buildEnOnlyLanguageAlternates } from "@/lib/hreflang-paths";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: { absolute: "Terms of Use — Fine Art Free" },
  description:
    "Fine Art Free provides public domain artworks free to download and use for any purpose including commercial.",
  alternates: {
    canonical: absoluteUrl("/terms"),
    languages: buildEnOnlyLanguageAlternates("/terms"),
  },
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold mb-8">Terms of Use</h1>

      <section className="prose prose-sm text-[#4a4a4a] space-y-6">
        <p>
          In recent years, major museums and libraries around the world have adopted open access policies, designating
          public domain works in their collections with Creative Commons Zero (CC0) licenses — making them freely
          available for any purpose, including commercial use.
        </p>
        <p>
          Fine Art Free aggregates the best of these images in one place to make them easy to discover and download.
          Permission is granted to all users to download, share and reuse these images with no restrictions attached.
        </p>
        <p>
          Some images are sourced from Wikimedia Commons, in which case we follow their stance on public domain images:
          photographs that faithfully reproduce two-dimensional public domain works are also in the public domain. This
          is supported by court rulings including the U.S. case of Bridgeman Art Library v. Corel Corp.
        </p>
        <p>
          The European Union Directive on Copyright in the Digital Single Market (Article 14), which came into force on
          7 June 2019, states that reproductions of public domain visual artworks cannot be subject to copyright or
          related rights unless the reproduction is an original creative work.
        </p>
        <p>A full list of countries and their copyright lengths can be found on Wikipedia.</p>
      </section>
    </main>
  );
}
