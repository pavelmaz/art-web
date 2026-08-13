/** Skeleton shown while a search page server-renders (Next.js loading.tsx). */
export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10" aria-busy="true" aria-label="Loading search results">
      <div className="mb-6 h-9 w-64 animate-pulse rounded bg-[#eceae4]" />
      <div className="mb-6 flex gap-7 border-b border-[#e5e2da] pb-3">
        {[84, 68, 60, 64].map((w, i) => (
          <div key={i} className="h-4 animate-pulse rounded bg-[#eceae4]" style={{ width: w }} />
        ))}
      </div>
      <div className="columns-2 [column-gap:16px] md:columns-3 lg:columns-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="mb-4 break-inside-avoid">
            <div className="animate-pulse rounded bg-[#eceae4]" style={{ height: 150 + ((i * 37) % 120) }} />
            <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-[#eceae4]" />
            <div className="mt-1 h-3 w-1/2 animate-pulse rounded bg-[#eceae4]" />
          </div>
        ))}
      </div>
    </div>
  );
}
