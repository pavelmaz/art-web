"use client";

import { useState } from "react";

import type { FineArtProCopy } from "@/lib/fineart-pro-translations";

/**
 * Serializable shape of the join copy: the two interpolating functions
 * (selectedPlan / signedInAs) are resolved to strings on the server before being
 * passed here, because functions cannot cross the server→client boundary.
 */
type JoinAuthCopy = Omit<FineArtProCopy["joinAuth"], "selectedPlan" | "signedInAs"> & {
  selectedPlanLabel: string;
  signedInAsLabel: string;
  continueEmailLabel: string;
};

type FineArtProJoinAuthProps = {
  plan: "monthly" | "yearly" | null;
  coupon?: string | null;
  isLoggedIn: boolean;
  copy: JoinAuthCopy;
};

/**
 * Fallback checkout control. With a plan in the URL the join page redirects
 * straight to Stripe server-side, so this only renders when no plan was picked
 * or that redirect didn't happen (checkout API error). Accounts are created
 * after payment, on the success page — there is no sign-in step here.
 */
export function FineArtProJoinAuth({ plan, coupon, isLoggedIn, copy }: FineArtProJoinAuthProps) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const startCheckout = async () => {
    if (!plan) {
      setNotice(copy.choosePlanFirst);
      return;
    }
    setNotice(null);
    setBusy(true);
    const res = await fetch("/api/stripe/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, coupon }),
    });
    let data: { url?: string; error?: string } = {};
    try {
      data = (await res.json()) as { url?: string; error?: string };
    } catch {
      setNotice(copy.unexpectedResponse);
      setBusy(false);
      return;
    }
    setBusy(false);
    if (!res.ok) {
      setNotice(data.error ?? copy.checkoutFailed);
      return;
    }
    if (data.url) {
      window.location.href = data.url;
    } else {
      setNotice(copy.noCheckoutUrl);
    }
  };

  return (
    <div className="mt-6 space-y-4">
      {isLoggedIn ? <p className="text-sm text-[#6b6b6b]">{copy.signedInAsLabel}</p> : null}

      {plan ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void startCheckout()}
          className="w-full rounded-lg bg-[#1a1a1a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-60"
        >
          {copy.continueCheckout}
        </button>
      ) : (
        <p className="text-sm text-[#6b6b6b]">{copy.choosePlanOnLanding}</p>
      )}

      {notice ? <p className="text-sm text-[#1a1a1a]">{notice}</p> : null}
    </div>
  );
}
