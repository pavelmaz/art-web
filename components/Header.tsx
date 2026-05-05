"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header
      className={
        isHome
          ? "absolute inset-x-0 top-0 z-20 bg-transparent"
          : "border-b border-neutral-800 bg-black"
      }
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        >
          <Image
            src="/logo-fine-art.svg"
            alt="Fine Art"
            width={1024}
            height={1024}
            priority
            className="h-9 w-auto max-h-9 max-w-[200px] object-contain object-left"
          />
        </Link>

        <nav aria-label="Main navigation" className="flex items-center gap-6 text-sm">
          <Link
            href="/artworks"
            className={
              isHome ? "text-white/85 hover:text-white" : "text-white/80 hover:text-white"
            }
          >
            Artworks
          </Link>
          <Link
            href="/styles"
            className={
              isHome ? "text-white/85 hover:text-white" : "text-white/80 hover:text-white"
            }
          >
            Styles
          </Link>
          <Link
            href="/genres"
            className={
              isHome ? "text-white/85 hover:text-white" : "text-white/80 hover:text-white"
            }
          >
            Genres
          </Link>
          <Link
            href="/artists"
            className={
              isHome ? "text-white/85 hover:text-white" : "text-white/80 hover:text-white"
            }
          >
            Artists
          </Link>
          <Link
            href="/museums"
            className={
              isHome ? "text-white/85 hover:text-white" : "text-white/80 hover:text-white"
            }
          >
            Museums
          </Link>
        </nav>
      </div>
    </header>
  );
}
