import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FineArtProJoinAuth } from "@/components/FineArtProJoinAuth";
import { ProArtStrip } from "@/components/ProArtStrip";
import { fineArtProJoinPath, fineArtProPath } from "@/lib/fineart-pro-path";
import { getFineArtProT } from "@/lib/fineart-pro-translations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/translations";

type SearchParams = Promise<{ plan?: string; error?: string; art?: string }>;

/** Universities whose libraries list Fine Art Free — real, verifiable social proof
 *  (unlike the placeholder testimonials, which must not be used on a paid page). */
const UNIVERSITY_LOGOS = [
  { file: "york.png", name: "University of York" },
  { file: "waterloo.png", name: "University of Waterloo" },
  { file: "alberta.png", name: "University of Alberta" },
  { file: "skidmore.png", name: "Skidmore College" },
  { file: "seville.png", name: "University of Seville" },
] as const;

type FineArtProJoinPageProps = {
  locale: Locale;
  searchParams: SearchParams;
};

export async function FineArtProJoinPage({
  locale,
  searchParams,
}: FineArtProJoinPageProps) {
  const sp = await searchParams;
  const plan = sp.plan === "yearly" || sp.plan === "monthly" ? sp.plan : null;
  const authError = sp.error;
  const artSlug = sp.art ?? null;
  const c = getFineArtProT(locale);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && plan) {
    const headerList = await headers();
    const cookieHeader = headerList.get("cookie") ?? "";
    const envBase = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
    const host =
      headerList.get("x-forwarded-host") ??
      headerList.get("host") ??
      "localhost:3000";
    const proto = headerList.get("x-forwarded-proto") ?? "http";
    const base = envBase || `${proto}://${host}`;

    const res = await fetch(`${base}/api/stripe/create-checkout-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({ plan }),
    });

    const payload = (await res.json()) as { url?: string };
    if (payload.url) {
      redirect(payload.url);
    }
  }

  const nextPath = fineArtProJoinPath(locale, plan, artSlug);

  // Resolve the locale's interpolating copy server-side: functions can't be passed
  // to a Client Component, so the client receives plain strings instead.
  const { selectedPlan, signedInAs, ...joinAuthRest } = c.joinAuth;
  const joinAuthCopy = {
    ...joinAuthRest,
    selectedPlanLabel: plan ? selectedPlan(plan) : "",
    signedInAsLabel: signedInAs(user?.email ?? ""),
    continueEmailLabel: c.joinContinueEmail,
  };

  // Plan-aware order summary: whichever card they clicked (yearly | monthly) is
  // echoed back with its real price, so the number never disappears at the moment
  // of commitment. Strings come from the same localized copy as the landing page.
  const planCopy =
    plan === "yearly"
      ? {
          name: c.yearlyPlan,
          price: c.yearlyPrice,
          billing: c.yearlyBilling,
          save: c.yearlySave,
        }
      : plan === "monthly"
        ? {
            name: c.monthlyPlan,
            price: c.monthlyPrice,
            billing: c.monthlyBilling,
            save: null,
          }
        : null;

  return (
    <div className="min-h-[50vh] bg-[#f6f4ee]">
      {/* Moving strip of masterpieces: makes the checkout look like an art site
          without adding anything to read or decide. */}
      <ProArtStrip leadSlug={artSlug} />

      <div className="px-3 py-10 md:px-6 md:py-12">
        {/* ONE centred column — every element points at the single action. */}
        <div className="mx-auto max-w-md">
          <p className="text-xs font-medium uppercase tracking-wide text-[#6b6b6b]">
            {c.joinEyebrow}
          </p>
          <h1 className="mt-2 text-[1.75rem] font-bold leading-tight tracking-tight text-[#1a1a1a] sm:text-[2rem]">
            {c.joinHeadline}
          </h1>
          <p className="mt-1.5 text-sm text-[#6b6b6b]">{c.joinH1}</p>

          {/* Step indicator — a visible "2 steps, you're on the first" beats an
            unexplained sign-in wall. */}
          <div className="mt-5 flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1a1a1a] px-2.5 py-1 font-medium text-white">
              <span className="grid size-4 place-items-center rounded-full bg-white/25 text-[10px]">
                1
              </span>
              {c.joinStepAccount}
            </span>
            <span className="h-px w-4 bg-[#d8d5cd]" aria-hidden />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d8d5cd] px-2.5 py-1 text-[#6b6b6b]">
              <span className="grid size-4 place-items-center rounded-full bg-[#e8e6e1] text-[10px]">
                2
              </span>
              {c.joinStepPayment}
            </span>
          </div>

          {/* Order summary for the plan they picked. */}
          {planCopy ? (
            <div className="mt-5 rounded-xl border border-[#e3e0d9] bg-white p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[#9a9a9a]">
                {c.joinYourPlan}
              </p>
              <div className="mt-1.5 flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-[#1a1a1a]">
                  {planCopy.name}
                </span>
                <span className="text-lg font-bold tracking-tight text-[#1a1a1a]">
                  {planCopy.price}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="text-xs text-[#6b6b6b]">
                  {planCopy.billing}
                </span>
                {planCopy.save ? (
                  <span className="rounded-full bg-[#e7f4e7] px-2 py-0.5 text-[11px] font-semibold text-[#2c6e30]">
                    {planCopy.save}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          <p className="mt-4 text-sm leading-relaxed text-[#4a4a4a]">
            {c.joinWhyAccount}
          </p>

          {authError ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {c.joinAuthError} {c.joinNoCharge}
            </p>
          ) : null}

          <FineArtProJoinAuth
            nextPath={nextPath}
            plan={plan}
            isLoggedIn={!!user}
            copy={joinAuthCopy}
          />

          {/* Trust row — same reassurance the landing page closes with. */}
          <p className="mt-5 text-center text-xs text-[#6b6b6b]">{c.ctaNote}</p>

          {/* Short benefits reminder (reuses the comparison rows, already localized). */}
          <div className="mt-6 rounded-xl border border-[#e8e6e1] bg-[#faf9f6] p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[#9a9a9a]">
              {c.joinIncluded}
            </p>
            <ul className="mt-2 space-y-1.5">
              {c.comparison.map((row) => (
                <li
                  key={row.feature}
                  className="flex items-start gap-2 text-[13px] text-[#4a4a4a]"
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden
                  >
                    <path
                      d="M4.5 10.5l3.5 3.5 7.5-7.5"
                      stroke="#3b8e3f"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>
                    {row.feature}
                    {typeof row.pro === "string" ? (
                      <span className="text-[#8a8a8a]"> — {row.pro}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Real social proof: university libraries that list Fine Art Free. */}
          <div className="mt-8">
            <p className="text-center text-[11px] font-medium uppercase tracking-[0.14em] text-[#9a9a9a]">
              {c.joinTrustedBy}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
              {UNIVERSITY_LOGOS.map((u) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={u.file}
                  src={`/images/university-logos/${u.file}`}
                  alt={u.name}
                  className="h-6 w-auto opacity-45 mix-blend-multiply"
                  loading="lazy"
                />
              ))}
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-[#6b6b6b]">
            <Link
              href={fineArtProPath(locale)}
              className="text-[#1a1a1a] underline underline-offset-2 hover:no-underline"
            >
              {c.joinBack}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
