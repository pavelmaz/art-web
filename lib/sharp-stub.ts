/**
 * Stands in for `sharp` in the Cloudflare Workers build (aliased in
 * next.config.ts when OPEN_NEXT_CLOUDFLARE_BUILD is set). sharp is a native
 * Node module that can't run on Workers; the one call site
 * (lib/webp-to-jpeg.ts) uses the Cloudflare Images binding there instead and
 * never reaches this.
 */
export default function sharp(): never {
  throw new Error("sharp is not available in the Cloudflare Workers build");
}
