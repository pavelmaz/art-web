import type { ReactNode } from "react";

import { SiteShell } from "@/components/SiteShell";
import { ROOT_METADATA } from "@/lib/root-metadata";

export const metadata = ROOT_METADATA;

// Root layout for the German routes: exists so the server renders <html lang="de">.
export default function GermanLayout({ children }: { children: ReactNode }) {
  return <SiteShell lang="de">{children}</SiteShell>;
}
