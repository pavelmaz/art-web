import Stripe from "stripe";

/**
 * Stripe pins a single API version per `stripe` major release (TypeScript enforces it).
 * `stripe@22` expects `2026-04-22.dahlia` — older strings like `2024-06-20` fail the type checker.
 */
const API_VERSION = "2026-04-22.dahlia" as const;

let stripeSingleton: Stripe | undefined;

/**
 * Lazy singleton so `next build` can analyze routes without STRIPE_SECRET_KEY in the environment.
 * Call at request time, not at module top level.
 */
export function getStripe(): Stripe {
  if (!stripeSingleton) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    stripeSingleton = new Stripe(key, { apiVersion: API_VERSION });
  }
  return stripeSingleton;
}
