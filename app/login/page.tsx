import type { Metadata } from "next";
import Link from "next/link";

import { LoginAuth, ManageSubscriptionButton, SignOutButton } from "@/components/LoginAuth";
import { fineArtProPath } from "@/lib/fineart-pro-path";
import { getFineArtProT } from "@/lib/fineart-pro-translations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getT, translations, type Locale } from "@/lib/translations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Log in — Fine Art Free",
  robots: { index: false, follow: false },
};

function resolveLocale(raw: string | undefined): Locale {
  return raw && raw in translations ? (raw as Locale) : "en";
}

type LoginPageProps = {
  searchParams: Promise<{ loc?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { loc } = await searchParams;
  const locale = resolveLocale(loc);
  const t = getT(locale);
  const joinAuth = getFineArtProT(locale).joinAuth;
  const nextPath = locale === "en" ? "/login" : `/login?loc=${locale}`;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isPro = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .maybeSingle();
    isPro = profile?.subscription_status === "active";
  }

  return (
    <main className="mx-auto w-full max-w-md px-5 py-16">
      <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1a]">
        {user ? t.navAccount : t.navLogin}
      </h1>

      {user ? (
        <div className="mt-8 space-y-5 rounded-2xl border border-[#e8e6e1] bg-white p-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#9a9a9a]">{t.loginSignedInAs}</p>
            <p className="mt-1 break-all text-sm font-medium text-[#1a1a1a]">{user.email}</p>
          </div>

          {isPro ? (
            <div className="space-y-3">
              <p className="inline-flex items-center gap-2 rounded-full bg-[#e7f4e7] px-3 py-1.5 text-sm font-medium text-[#2c6e30]">
                <span aria-hidden>✓</span>
                {t.loginProActive}
              </p>
              <div>
                <ManageSubscriptionButton
                  locale={locale}
                  label={t.loginManageSubscription}
                  errorLabel={t.loginPortalError}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-[#6b6b6b]">{t.loginProInactive}</p>
              <Link
                href={fineArtProPath(locale)}
                className="inline-flex items-center justify-center rounded-lg bg-[#F5C278] px-4 py-2.5 text-sm font-bold text-[#1a1a1a] transition-colors hover:bg-[#e8b560]"
              >
                {t.insightsLimitCta}
              </Link>
            </div>
          )}

          <div className="border-t border-[#e8e6e1] pt-4">
            <SignOutButton label={t.signOut} />
          </div>
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm leading-relaxed text-[#6b6b6b]">{t.loginIntro}</p>
          <LoginAuth
            nextPath={nextPath}
            copy={{
              continueGoogle: joinAuth.continueGoogle,
              or: joinAuth.or,
              emailPlaceholder: joinAuth.emailPlaceholder,
              emailLink: joinAuth.emailLink,
              checkEmail: joinAuth.checkEmail,
            }}
          />
        </>
      )}
    </main>
  );
}
