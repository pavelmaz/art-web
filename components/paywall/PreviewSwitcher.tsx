import Link from "next/link";

/** Thin top bar for the paywall PREVIEW pages (/paywall-1…4). Lets us jump
 *  between the four concepts while reviewing them. These pages are noindex and
 *  their CTAs are intentionally unwired — they exist to compare formats. */
const VARIANTS = [
  { n: 1, name: "Contextual unlock" },
  { n: 2, name: "4K proof slider" },
  { n: 3, name: "Anchored hero" },
  { n: 4, name: "Trust-stacked CTA" },
] as const;

export function PreviewSwitcher({ active }: { active: 1 | 2 | 3 | 4 }) {
  return (
    <div className="sticky top-0 z-[60] flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-white/10 bg-[#12100e] px-4 py-2 text-[12px] text-white/70">
      <span className="font-semibold text-white/90">Paywall preview</span>
      <span className="text-white/30">·</span>
      {VARIANTS.map((v) => (
        <Link
          key={v.n}
          href={`/paywall-${v.n}`}
          className={`rounded-md px-2 py-0.5 transition ${
            v.n === active
              ? "bg-white font-semibold text-[#12100e]"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          {v.n}. {v.name}
        </Link>
      ))}
      <span className="ml-auto text-white/35">not wired · preview only</span>
    </div>
  );
}
