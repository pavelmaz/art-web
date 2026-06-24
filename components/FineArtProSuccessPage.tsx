import Link from "next/link";

import { ProPurchaseTracking, type VerifiedPurchase } from "@/components/ProPurchaseTracking";
import { fineArtProPath } from "@/lib/fineart-pro-path";
import { getFineArtProT } from "@/lib/fineart-pro-translations";
import { localePath } from "@/lib/locale-routes";
import type { Locale } from "@/lib/translations";

type FineArtProSuccessPageProps = {
  locale: Locale;
  /** Set only on the page Stripe actually redirects to (the EN success route). */
  purchase?: VerifiedPurchase | null;
};

export function FineArtProSuccessPage({ locale, purchase = null }: FineArtProSuccessPageProps) {
  const c = getFineArtProT(locale);
  const artworksHref = localePath(locale, "artworks");

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-5">
      {purchase ? <ProPurchaseTracking {...purchase} /> : null}
      <div className="max-w-lg space-y-4 text-center">
        <h1 className="text-3xl font-semibold text-[#1a1a1a]">{c.successH1}</h1>
        <p className="text-[#6b6b6b]">{c.successBody}</p>
        <Link
          href={artworksHref}
          className="inline-block rounded-lg bg-black px-6 py-3 text-white transition-colors hover:bg-[#333]"
        >
          {c.successBrowse}
        </Link>
        <p className="text-sm text-[#6b6b6b]">
          <Link href={fineArtProPath(locale)} className="underline underline-offset-2 hover:no-underline">
            {c.productName}
          </Link>
        </p>
      </div>
    </div>
  );
}
