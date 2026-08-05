import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { AccountTabs } from "@/components/account/AccountTabs";
import { ConsentSync } from "@/components/account/ConsentSync";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My account — Fine Art Free",
  robots: { index: false, follow: false },
};

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No redirect here: the layout doesn't know which page was requested, so it
  // would send everyone to /account and lose the deep link. Each page calls
  // requireUser() with its own path and redirects with the correct `next`.
  if (!user) return <>{children}</>;

  const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "";
  const avatar = user.user_metadata?.avatar_url as string | undefined;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10">
      <header className="mb-8 flex items-center gap-4">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="size-16 rounded-full object-cover" />
        ) : (
          <span
            className="flex size-16 items-center justify-center rounded-full bg-[#e8e6e1] text-xl font-semibold uppercase text-[#6b6b6b]"
            aria-hidden
          >
            {name.slice(0, 1)}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-[#1a1a1a]">{name}</h1>
          <p className="truncate text-sm text-[#6b6b6b]">{user.email}</p>
        </div>
      </header>

      <Suspense fallback={<div className="mb-8 h-10 border-b border-[#e8e6e1]" />}>
        <AccountTabs />
      </Suspense>

      {/* Persists the marketing choice made on /login, once, after auth. */}
      <ConsentSync userId={user.id} />

      {children}
    </main>
  );
}
