import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/app/"],
      },
      {
        userAgent: "GPTBot",
        disallow: ["/"],
      },
      {
        userAgent: "ChatGPT-User",
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
        userAgent: "PerplexityBot",
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
        userAgent: "Amazonbot",
        disallow: ["/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
