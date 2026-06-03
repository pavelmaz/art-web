/** Public site origin for sitemap <loc> (never use Supabase API host here). */
export function getPublicSiteUrl(): string {
  let raw = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/$/, "");
  if (raw && /supabase\.co/i.test(raw)) {
    raw = "";
  }
  if (raw) {
    return raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, "");
    return `https://${host}`;
  }
  return "https://fineartfree.com";
}

/** Remove characters illegal in XML 1.0 that can break sitemap parsers. */
export function sanitizeForXml(s: string): string {
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "");
}

export function escapeXml(s: string): string {
  return sanitizeForXml(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
