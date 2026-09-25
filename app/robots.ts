import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return {
    // AI-bot policy (25 Sep 2026): training crawlers are blocked below; search and
    // user-fetch bots (OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User,
    // PerplexityBot, Amazonbot) are ALLOWED so the site can be cited in AI answers.
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/app/", "/api/download"],
      },
      {
        userAgent: "GPTBot",
        disallow: ["/"],
      },
      {
        userAgent: "CCBot",
        disallow: ["/"],
      },
      {
        userAgent: "anthropic-ai",
        disallow: ["/"],
      },
      {
        userAgent: "Claude-Web",
        disallow: ["/"],
      },
      {
        userAgent: "Omgilibot",
        disallow: ["/"],
      },
      {
        userAgent: "FacebookBot",
        disallow: ["/"],
      },
      {
        userAgent: "Diffbot",
        disallow: ["/"],
      },
      {
        userAgent: "Bytespider",
        disallow: ["/"],
      },
      {
        userAgent: "ImagesiftBot",
        disallow: ["/"],
      },
      {
        userAgent: "cohere-ai",
        disallow: ["/"],
      },
      {
        userAgent: "ClaudeBot",
        disallow: ["/"],
      },
      {
        userAgent: "Google-Extended",
        disallow: ["/"],
      },
      {
        userAgent: "meta-externalagent",
        disallow: ["/"],
      },
      {
        userAgent: "Applebot-Extended",
        disallow: ["/"],
      },
      {
        userAgent: "KeenableBot",
        disallow: ["/"],
      },
      {
        userAgent: "Reflectionbot",
        disallow: ["/"],
      },
    ],
    // Only the CORE index is advertised (2026-09-22): Google was keeping ~3k of
    // the 1.05M URLs the full sitemaps listed, so the crawl budget now goes to
    // the pages worth indexing. /sitemap.xml (full catalogue) still exists and
    // is submitted by hand in Bing Webmaster Tools; IndexNow covers the rest.
    sitemap: `${baseUrl}/sitemap-core.xml`,
  };
}
