import type { Metadata } from "next";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/utils";

type StyleRow = {
  name: string;
  slug: string;
  description: string | null;
};

export const metadata: Metadata = {
  title: "Art Styles – Public Domain Art",
  description: "Browse public domain artworks by art style, movement, and artistic period.",
};

function previewDescription(text: string | null): string {
  if (!text) {
    return "";
  }

  if (text.length <= 120) {
    return text;
  }

  return `${text.slice(0, 117)}...`;
}

export default async function StylesPage() {
  const stylesQuery = await supabase
    .from("styles")
    .select("name, slug, description")
    .order("name", { ascending: true });

  if (stylesQuery.error) {
    return <p>Error loading data</p>;
  }

  let styles = (stylesQuery.data as StyleRow[] | null) ?? [];

  // If styles table is empty, derive styles from real artworks data.
  if (!styles.length) {
    const artworksQuery = await supabase
      .from("artworks")
      .select("style_title")
      .not("style_title", "is", null)
      .limit(5000);

    if (artworksQuery.error) {
      return <p>Error loading data</p>;
    }

    const styleNames = Array.from(
      new Set(
        ((artworksQuery.data as Array<{ style_title: string | null }> | null) ?? [])
          .map((item) => item.style_title?.trim())
          .filter((name): name is string => Boolean(name))
      )
    ).sort((a, b) => a.localeCompare(b));

    styles = styleNames.map((name) => ({
      name,
      slug: slugify(name),
      description: null,
    }));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Art Styles</h1>
      <p className="max-w-3xl text-neutral-700">
        Explore public domain artworks by style, movement, and artistic period.
      </p>

      {!styles.length ? (
        <p>No styles found.</p>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {styles.map((style) => (
            <article key={style.slug} className="rounded-lg border border-neutral-200 p-4">
              <h2 className="text-lg font-semibold">
                <Link href={`/styles/${style.slug}`} className="underline">
                  {style.name}
                </Link>
              </h2>
              {style.description ? (
                <p className="mt-2 text-sm text-neutral-700">{previewDescription(style.description)}</p>
              ) : null}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
