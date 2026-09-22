import type { ReactNode } from "react";

import { SiteShell } from "@/components/SiteShell";
import { ROOT_METADATA } from "@/lib/root-metadata";

export const metadata = ROOT_METADATA;

// Root layout for the Italian routes: exists so the server renders <html lang="it">.
export default function ItalianLayout({ children }: { children: ReactNode }) {
  return <SiteShell lang="it">{children}</SiteShell>;
}
