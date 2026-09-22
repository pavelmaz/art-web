import type { ReactNode } from "react";

import { SiteShell } from "@/components/SiteShell";
import { ROOT_METADATA } from "@/lib/root-metadata";

export const metadata = ROOT_METADATA;

// Root layout for the Korean routes: exists so the server renders <html lang="ko">.
export default function KoreanLayout({ children }: { children: ReactNode }) {
  return <SiteShell lang="ko">{children}</SiteShell>;
}
