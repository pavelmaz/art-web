import type { ReactNode } from "react";

import { SiteShell } from "@/components/SiteShell";
import { ROOT_METADATA } from "@/lib/root-metadata";

export const metadata = ROOT_METADATA;

// Root layout for the Chinese routes: exists so the server renders <html lang="zh">.
export default function ChineseLayout({ children }: { children: ReactNode }) {
  return <SiteShell lang="zh">{children}</SiteShell>;
}
