import Link from "next/link";

export function EmptyState({
  message,
  ctaLabel,
  ctaHref,
}: {
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#e8e6e1] p-10 text-center">
      <p className="text-sm text-[#6b6b6b]">{message}</p>
      {ctaLabel && ctaHref ? (
        <Link
          href={ctaHref}
          className="mt-4 inline-block rounded-full border border-[#dcd9d3] bg-white px-5 py-2.5 text-sm font-medium text-[#1a1a1a] transition hover:bg-[#f4f2ee]"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}
