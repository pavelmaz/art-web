import type { ReactNode } from "react";

import { SiteShell } from "@/components/SiteShell";
import { ROOT_METADATA } from "@/lib/root-metadata";

export const metadata = ROOT_METADATA;

// Root layout for the Japanese routes: exists so the server renders <html lang="ja">.
export default function JapaneseLayout({ children }: { children: ReactNode }) {
  return <SiteShell lang="ja">{children}</SiteShell>;
}
