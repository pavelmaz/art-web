import Link from "@/components/Link";

import { FineArtProSuccessAuth } from "@/components/FineArtProSuccessAuth";
import { ProPurchaseTracking, type VerifiedPurchase } from "@/components/ProPurchaseTracking";
import { fineArtProPath } from "@/lib/fineart-pro-path";
import { getFineArtProT } from "@/lib/fineart-pro-translations";
import { localePath } from "@/lib/locale-routes";
import type { Locale } from "@/lib/translations";

type FineArtProSuccessPageProps = {
  locale: Locale;
  /** Set only on the page Stripe actually redirects to (the EN success route). */
  purchase?: VerifiedPurchase | null;
  /** True when payment is confirmed but not yet tied to a signed-in account —
   *  the "pay first, register after" guest-checkout flow. */
  needsRegistration?: boolean;
  /** This same success URL (session_id included), so signing in redirects back
   *  here to finish linking the subscription. Required when needsRegistration. */
  nextPath?: string;
  prefillEmail?: string | null;
};

export function FineArtProSuccessPage({
  locale,
  purchase = null,
  needsRegistration = false,
  nextPath,
  prefillEmail = null,
}: FineArtProSuccessPageProps) {
  const c = getFineArtProT(locale);
  const artworksHref = localePath(locale, "artworks");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f4ee] px-5 py-12">
      {purchase && !needsRegistration ? <ProPurchaseTracking {...purchase} /> : null}
      <div className="max-w-lg space-y-4 text-center">
        {needsRegistration && nextPath ? (
          <>
            <h1 className="text-3xl font-semibold text-[#1a1a1a]">{c.successRegisterH1}</h1>
            <p className="text-[#6b6b6b]">{c.successRegisterBody}</p>
            <FineArtProSuccessAuth
              nextPath={nextPath}
              prefillEmail={prefillEmail}
              copy={{
                continueGoogle: c.joinAuth.continueGoogle,
                emailPlaceholder: c.joinAuth.emailPlaceholder,
                emailLink: c.joinAuth.emailLink,
                checkEmail: c.joinAuth.checkEmail,
              }}
            />
          </>
        ) : (
          <>
            <h1 className="text-3xl font-semibold text-[#1a1a1a]">{c.successH1}</h1>
            <p className="text-[#6b6b6b]">{c.successBody}</p>
            <Link
              href={artworksHref}
              className="inline-block rounded-lg bg-black px-6 py-3 text-white transition-colors hover:bg-[#333]"
            >
              {c.successBrowse}
            </Link>
          </>
        )}
        <p className="text-sm text-[#6b6b6b]">
          <Link href={fineArtProPath(locale)} className="underline underline-offset-2 hover:no-underline">
            {c.productName}
          </Link>
        </p>
      </div>
    </div>
  );
}
