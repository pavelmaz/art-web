import type { ReactNode } from "react";

import { SiteShell } from "@/components/SiteShell";
import { ROOT_METADATA } from "@/lib/root-metadata";

export const metadata = ROOT_METADATA;

// Root layout for the Portuguese routes: exists so the server renders <html lang="pt">.
export default function PortugueseLayout({ children }: { children: ReactNode }) {
  return <SiteShell lang="pt">{children}</SiteShell>;
}
