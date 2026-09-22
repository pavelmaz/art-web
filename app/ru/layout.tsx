import type { ReactNode } from "react";

import { SiteShell } from "@/components/SiteShell";
import { ROOT_METADATA } from "@/lib/root-metadata";

export const metadata = ROOT_METADATA;

// Root layout for the Russian routes: exists so the server renders <html lang="ru">.
export default function RussianLayout({ children }: { children: ReactNode }) {
  return <SiteShell lang="ru">{children}</SiteShell>;
}
