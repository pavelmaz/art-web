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

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
