import Link from "next/link";

export default function SuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-5">
      <div className="max-w-lg space-y-4 text-center">
        <h1 className="text-3xl font-semibold text-[#1a1a1a]">Welcome to Fine Art Free Pro!</h1>
        <p className="text-[#6b6b6b]">
          Your subscription is now active. You can now download all artworks in maximum resolution.
        </p>
        <Link
          href="/artworks"
          className="inline-block rounded-lg bg-black px-6 py-3 text-white transition-colors hover:bg-[#333]"
        >
          Browse Artworks
        </Link>
      </div>
    </div>
  );
}
