import Link from "next/link";

import type { BlogPostListItem } from "@/lib/blog-types";

type BlogPostCardProps = {
  post: BlogPostListItem;
};

function formatPublishedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function BlogPostCard({ post }: BlogPostCardProps) {
  return (
    <article className="group border-b border-[#e5e5e5] pb-8 last:border-b-0">
      <Link href={`/blog/${post.slug}`} className="block">
        {post.card_image_url ? (
          <div className="mb-4 overflow-hidden">
            <img
              src={post.card_image_url}
              alt=""
              className="aspect-[16/9] w-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-[1.02]"
              loading="lazy"
              decoding="async"
            />
          </div>
        ) : null}

        <time
          dateTime={post.published_at}
          className="text-xs uppercase tracking-wide text-[#6b6b6b]"
        >
          {formatPublishedDate(post.published_at)}
        </time>

        <h2 className="mt-2 text-xl font-semibold text-[#1a1a1a] group-hover:underline">
          {post.title}
        </h2>

        {post.meta_description ? (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#4a4a4a]">
            {post.meta_description}
          </p>
        ) : null}
      </Link>
    </article>
  );
}
