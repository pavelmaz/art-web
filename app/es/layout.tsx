import type { ReactNode } from "react";

import { SiteShell } from "@/components/SiteShell";
import { ROOT_METADATA } from "@/lib/root-metadata";

export const metadata = ROOT_METADATA;

// Root layout for the Spanish routes: exists so the server renders <html lang="es">.
export default function SpanishLayout({ children }: { children: ReactNode }) {
  return <SiteShell lang="es">{children}</SiteShell>;
}
