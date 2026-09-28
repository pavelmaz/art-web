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
      // SEO-tool and data-reseller crawlers (28 Sep 2026): they crawl the whole
      // 1M-page catalogue to sell link/keyword data to third parties and bring no
      // visitors — DataForSeoBot + SemrushBot alone were ~17% of the site's CPU.
      // All of these honour robots.txt. PetalBot (Huawei) is a search engine but
      // crawls aggressively for almost no visitors here. Also the AI training /
      // dataset crawlers listed on 25 Sep as not yet covered. AI *search* bots
      // (Claude-SearchBot, OAI-SearchBot, Perplexity, Amazonbot, YouBot) stay allowed.
      ...[
        "DataForSeoBot",
        "SemrushBot",
        "SemrushBot-BA",
        "SemrushBot-SI",
        "SemrushBot-SWA",
        "SiteAuditBot",
        "AhrefsBot",
        "AhrefsSiteAudit",
        "MJ12bot",
        "DotBot",
        "BLEXBot",
        "Barkrowler",
        "serpstatbot",
        "SeekportBot",
        "PetalBot",
        "img2dataset",
        "Ai2Bot",
        "Ai2Bot-Dolma",
        "cohere-training-data-crawler",
        "PanguBot",
        "Timpibot",
        "Webzio-Extended",
        "TikTokSpider",
      ].map((userAgent) => ({ userAgent, disallow: ["/"] })),
    ],
    // Only the CORE index is advertised (2026-09-22): Google was keeping ~3k of
    // the 1.05M URLs the full sitemaps listed, so the crawl budget now goes to
    // the pages worth indexing. /sitemap.xml (full catalogue) still exists and
    // is submitted by hand in Bing Webmaster Tools; IndexNow covers the rest.
    sitemap: `${baseUrl}/sitemap-core.xml`,
  };
}
