import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-semibold tracking-tight text-neutral-900">
          Public Domain Art
        </Link>

        <nav aria-label="Main navigation" className="flex items-center gap-6 text-sm">
          <Link href="/artworks" className="text-neutral-700 hover:text-neutral-900">
            Artworks
          </Link>
          <Link href="/styles" className="text-neutral-700 hover:text-neutral-900">
            Styles
          </Link>
          <Link href="/genres" className="text-neutral-700 hover:text-neutral-900">
            Genres
          </Link>
          <Link href="/artists" className="text-neutral-700 hover:text-neutral-900">
            Artists
          </Link>
          <Link href="/museums" className="text-neutral-700 hover:text-neutral-900">
            Museums
          </Link>
        </nav>
      </div>
    </header>
  );
}
