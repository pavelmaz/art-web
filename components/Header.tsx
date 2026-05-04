<<<<<<< HEAD
"use client";

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
          : "border-b border-neutral-200 bg-white"
      }
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className={isHome ? "text-xl font-semibold tracking-tight text-white" : "text-xl font-semibold tracking-tight text-neutral-900"}
        >
=======
import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-semibold tracking-tight text-neutral-900">
>>>>>>> 42d7ea5 (initial commit)
          Public Domain Art
        </Link>

        <nav aria-label="Main navigation" className="flex items-center gap-6 text-sm">
<<<<<<< HEAD
          <Link
            href="/artworks"
            className={isHome ? "text-white/85 hover:text-white" : "text-neutral-700 hover:text-neutral-900"}
          >
            Artworks
          </Link>
          <Link
            href="/styles"
            className={isHome ? "text-white/85 hover:text-white" : "text-neutral-700 hover:text-neutral-900"}
          >
            Styles
          </Link>
          <Link
            href="/genres"
            className={isHome ? "text-white/85 hover:text-white" : "text-neutral-700 hover:text-neutral-900"}
          >
            Genres
          </Link>
          <Link
            href="/artists"
            className={isHome ? "text-white/85 hover:text-white" : "text-neutral-700 hover:text-neutral-900"}
          >
            Artists
          </Link>
          <Link
            href="/museums"
            className={isHome ? "text-white/85 hover:text-white" : "text-neutral-700 hover:text-neutral-900"}
          >
            Museums
          </Link>
=======
          <Link href="/artworks" className="text-neutral-700 hover:text-neutral-900">
            Artworks
          </Link>
          <Link href="/styles/impressionism" className="text-neutral-700 hover:text-neutral-900">
            Styles
          </Link>
>>>>>>> 42d7ea5 (initial commit)
        </nav>
      </div>
    </header>
  );
}
