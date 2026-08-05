import Link from "next/link";

import { ManageSubscriptionButton } from "@/components/LoginAuth";
import { requireUser, resolveLocale } from "@/lib/account";
import { fineArtProPath } from "@/lib/fineart-pro-path";
import { getFineArtProT } from "@/lib/fineart-pro-translations";
import { getLibraryT } from "@/lib/library-translations";
import { getT } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ loc?: string }>;
}) {
  const { loc } = await searchParams;
  const locale = resolveLocale(loc);
  const t = getLibraryT(locale);
  const base = getT(locale);
  const pro = getFineArtProT(locale);
  const { supabase, user } = await requireUser("/account/subscription");

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, plan_interval")
    .eq("id", user.id)
    .maybeSingle();

  const isPro = profile?.subscription_status === "active";

  return (
    <div className="max-w-xl">
      <div className="rounded-2xl border border-[#e8e6e1] bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#9a9a9a]">
              {t.accountSubscription}
            </p>
            <p className="mt-1 text-lg font-semibold text-[#1a1a1a]">
              {isPro ? t.planPro : t.planFree}
            </p>
          </div>
          {isPro ? (
            <span className="rounded-full bg-[#e7f4e7] px-3 py-1.5 text-sm font-medium text-[#2c6e30]">
              ✓ {base.loginProActive}
            </span>
          ) : null}
        </div>

        <p className="mt-3 text-sm leading-relaxed text-[#6b6b6b]">
          {isPro ? t.planProBlurb : t.planFreeBlurb}
        </p>

        {isPro ? (
          <div className="mt-5 space-y-4">
            {profile?.plan_interval ? (
              <p className="text-sm text-[#4a4a4a]">
                {profile.plan_interval === "month" ? t.billedMonthly : t.billedYearly}
              </p>
            ) : null}
            <ManageSubscriptionButton
              locale={locale}
              label={t.manageSubscription}
              errorLabel={base.loginPortalError}
            />
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <PlanCard
                title={pro.yearlyPrice}
                sub={pro.yearlyBilling}
                highlight
                href={fineArtProPath(locale)}
                cta={t.upgradeToPro}
              />
              <PlanCard
                title={pro.monthlyPrice}
                sub={pro.monthlyBilling}
                href={fineArtProPath(locale)}
                cta={t.upgradeToPro}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PlanCard({
  title,
  sub,
  href,
  cta,
  highlight,
}: {
  title: string;
  sub: string;
  href: string;
  cta: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight ? "border-[#e4a23c] bg-[#fdf9f1]" : "border-[#e8e6e1] bg-white"
      }`}
    >
      <p className="text-base font-semibold text-[#1a1a1a]">{title}</p>
      <p className="mt-0.5 text-xs text-[#6b6b6b]">{sub}</p>
      <Link
        href={href}
        className={`mt-3 inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-bold transition ${
          highlight
            ? "bg-gradient-to-br from-[#F5C278] to-[#E4A23C] text-[#1a1a1a] hover:brightness-95"
            : "border border-[#dcd9d3] bg-white text-[#1a1a1a] hover:bg-[#f4f2ee]"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}
