import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Minimal shape of Cloudflare's Images binding (avoids a @cloudflare/workers-types dependency). */
type ImagesBinding = {
  input(stream: ReadableStream<Uint8Array>): {
    output(options: { format: "image/jpeg"; quality?: number }): Promise<{
      image(): ReadableStream<Uint8Array>;
    }>;
  };
};

function cloudflareImages(): ImagesBinding | null {
  try {
    // Sync mode only: on Vercel/Node this throws (no Workers context) and we
    // fall through to sharp. Never use `{ async: true }` here — off-Workers it
    // would try to spawn wrangler.
    const env = getCloudflareContext().env as { IMAGES?: ImagesBinding };
    return env.IMAGES ?? null;
  } catch {
    return null;
  }
}

/**
 * Convert a WebP response body to JPEG. Cloudflare Images binding on Workers
 * (streaming — no buffering the whole file in a 128 MB isolate), sharp on Node.
 * Returns null if conversion isn't possible so the caller can serve the original.
 */
export async function webpToJpeg(
  upstream: Response
): Promise<ReadableStream<Uint8Array> | Uint8Array<ArrayBuffer> | null> {
  if (!upstream.body) return null;
  try {
    const images = cloudflareImages();
    if (images) {
      const result = await images.input(upstream.body).output({ format: "image/jpeg", quality: 90 });
      return result.image();
    }
    const { default: sharp } = await import("sharp");
    const converted = await sharp(Buffer.from(await upstream.arrayBuffer())).jpeg({ quality: 90 }).toBuffer();
    return new Uint8Array(converted);
  } catch {
    return null;
  }
}
