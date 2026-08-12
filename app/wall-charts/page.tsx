import { permanentRedirect } from "next/navigation";

// Wall charts merged back into /prints (user decision) — 308 keeps the
// briefly-indexed /wall-charts URLs alive.
export default function Page() {
  permanentRedirect("/prints");
}
