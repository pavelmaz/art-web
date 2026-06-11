import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BlogHtml } from "@/components/BlogHtml";
import { BlogPostingJsonLd } from "@/components/BlogPostingJsonLd";
import {
  blogArtworkCaption,
  blogPostHeroImage,
  getBlogPostBySlug,
  getPublishedBlogSlugs,
} from "@/lib/blog";
import { artworkDetailPath } from "@/lib/locale-routes";
import { absoluteUrl, artworkImageUrl } from "@/lib/utils";

export const revalidate = 3600;

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await getPublishedBlogSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    return { title: "Post not found" };
  }

  const isDraft = post.status === "draft";

  return {
    title: post.meta_title || post.title,
    description: post.meta_description || undefined,
    alternates: {
      canonical: absoluteUrl(`/blog/${post.slug}`),
    },
    ...(isDraft
      ? {
          robots: {
            index: false,
            follow: false,
          },
        }
      : {}),
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const isDraft = post.status === "draft";
  const heroImage = blogPostHeroImage(post);

  return (
    <>
      {!isDraft && post.published_at ? (
        <BlogPostingJsonLd
          headline={post.title}
          slug={post.slug}
          datePublished={post.published_at}
          imageUrl={heroImage}
        />
      ) : null}

      <main className="mx-auto max-w-3xl px-4 py-12">
        {isDraft ? (
          <p className="mb-4 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-900">
            Draft
          </p>
        ) : null}

        <h1 className="mb-8 text-2xl font-semibold text-[#1a1a1a]">{post.title}</h1>

        <BlogHtml html={post.intro_html} className="mb-10" />

        {post.sections.map((section, index) => {
          const artwork = section.artwork;
          const imageSrc = artwork
            ? artworkImageUrl({ image_id: artwork.image_id, url: artwork.url })
            : "";

          return (
            <section key={`${section.heading}-${index}`} className="mb-10">
              {section.heading ? (
                <h2 className="mb-4 text-lg font-semibold text-[#1a1a1a]">{section.heading}</h2>
              ) : null}

              {artwork && imageSrc ? (
                <figure className="mb-4">
                  <Link
                    href={artworkDetailPath("en", artwork.slug)}
                    className="block overflow-hidden"
                  >
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

              <BlogHtml html={section.html} />
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
