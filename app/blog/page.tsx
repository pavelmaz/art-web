import type { Metadata } from "next";

import { BlogPostCard } from "@/components/BlogPostCard";
import { getPublishedBlogPosts } from "@/lib/blog";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Articles about public domain art, artists, and art history from Fine Art Free.",
  alternates: {
    canonical: absoluteUrl("/blog"),
  },
};

export default async function BlogIndexPage() {
  const posts = await getPublishedBlogPosts();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-semibold text-[#1a1a1a]">Blog</h1>
      <p className="mb-10 text-sm leading-relaxed text-[#4a4a4a]">
        Stories and guides about public domain art, artists, and art history.
      </p>

      {posts.length === 0 ? (
        <p className="text-sm text-[#6b6b6b]">No posts published yet.</p>
      ) : (
        <div className="space-y-8">
          {posts.map((post) => (
            <BlogPostCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </main>
  );
}
