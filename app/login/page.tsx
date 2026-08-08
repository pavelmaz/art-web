import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginAuth } from "@/components/LoginAuth";
import { getFineArtProT } from "@/lib/fineart-pro-translations";
import { getLibraryT } from "@/lib/library-translations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getT, translations, type Locale } from "@/lib/translations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Log in — Fine Art Free" },
  robots: { index: false, follow: false },
};

function resolveLocale(raw: string | undefined): Locale {
  return raw && raw in translations ? (raw as Locale) : "en";
}

/** Only same-origin relative paths may be used as a post-login destination. */
function safeNext(next: string | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

type LoginPageProps = {
  searchParams: Promise<{ loc?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { loc, next } = await searchParams;
  const locale = resolveLocale(loc);
  const t = getT(locale);
  const lib = getLibraryT(locale);
  const joinAuth = getFineArtProT(locale).joinAuth;

  const dest = safeNext(next);
  const accountPath = locale === "en" ? "/account" : `/account?loc=${locale}`;
  // After auth, land back where they were (a saved artwork) or in the panel.
  const nextPath = dest ?? accountPath;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Already signed in — the account panel is the destination now, not this page.
  if (user) redirect(nextPath);

  return (
    <main className="mx-auto flex w-full max-w-[26rem] flex-col px-5 py-16 sm:py-24">
      <h1 className="text-center text-[1.75rem] font-semibold leading-tight tracking-tight text-[#1a1a1a] sm:text-[2rem]">
        {t.navLogin}
      </h1>
      <p className="mt-3 text-center text-sm leading-relaxed text-[#6b6b6b]">
        {dest ? lib.signInToSave : t.loginIntro}
      </p>

      <LoginAuth
        nextPath={nextPath}
        copy={{
          continueGoogle: joinAuth.continueGoogle,
          or: joinAuth.or,
          emailPlaceholder: joinAuth.emailPlaceholder,
          emailLink: joinAuth.emailLink,
          checkEmail: joinAuth.checkEmail,
        }}
        consentLabel={lib.marketingConsent}
        consentHint={lib.marketingConsentHint}
      />

      <p className="mt-10 text-center text-xs text-[#9a9a9a]">
        <Link href="/terms" className="underline underline-offset-2 hover:text-[#6b6b6b]">
          Terms of Use
        </Link>
      </p>
    </main>
  );
}
