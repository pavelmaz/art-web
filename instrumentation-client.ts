// Runs once in the browser before the app becomes interactive (Next.js
// instrumentation-client convention). Keep it tiny: anything heavy is loaded
// lazily by the module it calls.
import { initPostHog } from "@/lib/posthog-client";

initPostHog();
