import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BlogHtml } from "@/components/BlogHtml";
import { BlogPostingJsonLd } from "@/components/BlogPostingJsonLd";
import {
  blogArtworkCaption,
  blogPostHeroImage,
  getPublishedBlogPostBySlug,
  getPublishedBlogSlugs,
} from "@/lib/blog";
import { artworkDetailPath } from "@/lib/locale-routes";
import { absoluteUrl, artworkImageUrl } from "@/lib/utils";

export const revalidate = 3600;

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  try {
    const slugs = await getPublishedBlogSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

function siteName(): string {
  return process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "Fine Art Free";
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const title = post.meta_title || post.title;
  const description = post.meta_description || undefined;
  const canonical = absoluteUrl(`/blog/${post.slug}`);
  const heroImage = blogPostHeroImage(post);

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
      siteName: siteName(),
      ...(post.published_at ? { publishedTime: post.published_at } : {}),
      ...(heroImage ? { images: [{ url: heroImage }] } : {}),
    },
    twitter: {
      card: heroImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(heroImage ? { images: [heroImage] } : {}),
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const heroImage = blogPostHeroImage(post);
  const datePublished = post.published_at ?? undefined;

  return (
    <>
      {datePublished ? (
        <BlogPostingJsonLd
          headline={post.title}
          slug={post.slug}
          datePublished={datePublished}
          imageUrl={heroImage}
        />
      ) : null}

      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="mb-8 text-2xl font-semibold text-[#1a1a1a]">{post.title}</h1>

        {post.intro_html ? <BlogHtml html={post.intro_html} className="mb-10" /> : null}

        {post.sections.map((section, index) => {
          const artwork = section.artwork;
          const artworkSlug = artwork?.slug?.trim();
          let imageSrc = "";

          if (artwork) {
            try {
              imageSrc = artworkImageUrl({
                image_id: artwork.image_id,
                url: artwork.url,
              });
            } catch {
              imageSrc = "";
            }
          }

          return (
            <section key={`${section.heading}-${index}`} className="mb-10">
              {section.heading ? (
                <h2 className="mb-4 text-lg font-semibold text-[#1a1a1a]">{section.heading}</h2>
              ) : null}

              {artwork && artworkSlug && imageSrc ? (
                <figure className="mb-4">
                  <Link href={artworkDetailPath("en", artworkSlug)} className="block overflow-hidden">
                    <img
                      src={imageSrc}
                      alt={artwork.alt_text?.trim() || artwork.title}
                      className="w-full"
                      loading="lazy"
                      decoding="async"
                    />
                  </Link>
                  <figcaption className="mt-2 text-xs text-[#6b6b6b]">
                    {blogArtworkCaption(artwork)}
                  </figcaption>
                </figure>
              ) : null}

              {section.html ? <BlogHtml html={section.html} /> : null}
            </section>
          );
        })}

        {post.conclusion_html ? (
          <BlogHtml html={post.conclusion_html} className="mt-10 border-t border-[#e5e5e5] pt-8" />
        ) : null}
      </main>
    </>
  );
}
