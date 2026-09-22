import type { ReactNode } from "react";

import { SiteShell } from "@/components/SiteShell";
import { ROOT_METADATA } from "@/lib/root-metadata";

export const metadata = ROOT_METADATA;

// Root layout for the English routes: exists so the server renders <html lang="en">.
export default function EnglishLayout({ children }: { children: ReactNode }) {
  return <SiteShell lang="en">{children}</SiteShell>;
}
