import type { ReactNode } from "react";

import { SiteShell } from "@/components/SiteShell";
import { ROOT_METADATA } from "@/lib/root-metadata";

export const metadata = ROOT_METADATA;

// Root layout for the French routes: exists so the server renders <html lang="fr">.
export default function FrenchLayout({ children }: { children: ReactNode }) {
  return <SiteShell lang="fr">{children}</SiteShell>;
}
