import { escapeXml, getPublicSiteUrl } from "@/lib/sitemap-xml";

export const dynamic = "force-dynamic";

const XML_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=0, must-revalidate",
} as const;

type SitemapEntry = {
  loc: string;
  changefreq?: string;
  priority?: number;
};

function buildUrlset(entries: SitemapEntry[]): string {
  const inner = entries
    .map((e) => {
      let xml = `  <url>\n    <loc>${escapeXml(e.loc)}</loc>`;
      if (e.changefreq) xml += `\n    <changefreq>${e.changefreq}</changefreq>`;
      if (e.priority != null) xml += `\n    <priority>${e.priority}</priority>`;
      xml += `\n  </url>`;
      return xml;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${inner}
</urlset>
`;
}

export async function GET() {
  const base = getPublicSiteUrl();

  const entries: SitemapEntry[] = [
    { loc: `${base}/es`, changefreq: "daily", priority: 1.0 },
    { loc: `${base}/es/obras`, changefreq: "daily", priority: 0.9 },
    { loc: `${base}/es/artistas`, changefreq: "weekly", priority: 0.8 },
    { loc: `${base}/es/estilos`, changefreq: "weekly", priority: 0.8 },
    { loc: `${base}/es/generos`, changefreq: "weekly", priority: 0.8 },
    { loc: `${base}/es/museos`, changefreq: "weekly", priority: 0.8 },
    { loc: `${base}/es/temas`, changefreq: "weekly", priority: 0.7 },
    { loc: `${base}/es/paises`, changefreq: "weekly", priority: 0.7 },
  ];

  return new Response(buildUrlset(entries), { status: 200, headers: XML_HEADERS });
}
