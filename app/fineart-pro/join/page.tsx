import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FineArtProJoinAuth } from "@/components/FineArtProJoinAuth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Join Fine Art Pro",
  description: "Create an account to subscribe to Fine Art Pro and download high-resolution artwork.",
};

type SearchParams = Promise<{ plan?: string; error?: string }>;

export default async function FineArtProJoinPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const plan = sp.plan === "yearly" || sp.plan === "monthly" ? sp.plan : null;
  const authError = sp.error;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && plan) {
    const headerList = await headers();
    const cookieHeader = headerList.get("cookie") ?? "";
    const envBase = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
    const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
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

  const nextPath = plan ? `/fineart-pro/join?plan=${plan}` : "/fineart-pro/join";

  return (
    <div className="min-h-[50vh] bg-white px-3 py-10 md:px-6 md:py-14">
      <div className="mx-auto max-w-md">
        <p className="text-xs font-medium uppercase tracking-wide text-[#6b6b6b]">Fine Art Pro</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#1a1a1a]">Sign in or register</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#4a4a4a]">
          Use Google or your email. After this step works end-to-end, the next step is Stripe checkout for your plan.
        </p>

        {authError ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            Something went wrong signing you in. Please try again.
          </p>
        ) : null}

        <FineArtProJoinAuth
          nextPath={nextPath}
          plan={plan}
          isLoggedIn={!!user}
          email={user?.email ?? null}
        />

        <p className="mt-8 text-center text-sm text-[#6b6b6b]">
          <Link href="/fineart-pro" className="text-[#1a1a1a] underline underline-offset-2 hover:no-underline">
            Back to Fine Art Pro
          </Link>
        </p>
      </div>
    </div>
  );
}
