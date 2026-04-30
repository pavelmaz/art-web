import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Header } from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Public Domain Art Gallery",
    template: "%s | Public Domain Art Gallery",
  },
  description:
    "Browse timeless public domain artworks by style, artist, and period. Free and open art references for study and inspiration.",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-neutral-50 text-neutral-900`}>
        <Header />
        <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
