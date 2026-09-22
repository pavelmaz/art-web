import { SignOutButton } from "@/components/LoginAuth";
import { DeleteAccountButton, MarketingToggle } from "@/components/account/ProfileControls";
import { requireUser, resolveLocale } from "@/lib/account";
import { getLibraryT } from "@/lib/library-translations";
import { getT } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ loc?: string }>;
}) {
  const { loc } = await searchParams;
  const locale = resolveLocale(loc);
  const t = getLibraryT(locale);
  const base = getT(locale);
  const { supabase, user } = await requireUser("/account/profile");

  const { data: profile } = await supabase
    .from("profiles")
    .select("marketing_opt_in")
    .eq("id", user.id)
    .maybeSingle();

  const created = user.created_at ? new Date(user.created_at) : null;
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "long" });

  return (
    <div className="max-w-xl space-y-8">
      <section className="rounded-2xl border border-[#e8e6e1] bg-white p-6">
        <dl className="space-y-4">
          <div>
            <dt className="text-xs uppercase tracking-wide text-[#9a9a9a]">{t.emailLabel}</dt>
            <dd className="mt-1 break-all text-sm font-medium text-[#1a1a1a]">{user.email}</dd>
          </div>
          {created ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-[#9a9a9a]">{t.memberSince}</dt>
              <dd className="mt-1 text-sm text-[#1a1a1a]">{dateFmt.format(created)}</dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-6 border-t border-[#e8e6e1] pt-5">
          <MarketingToggle
            userId={user.id}
            initial={(profile?.marketing_opt_in as boolean | null) ?? null}
            locale={locale}
          />
        </div>

        <div className="mt-6 border-t border-[#e8e6e1] pt-5">
          <SignOutButton label={base.signOut} />
        </div>
      </section>

      <section className="rounded-2xl border border-[#f0dedc] bg-[#fffbfa] p-6">
        <h2 className="text-sm font-semibold text-[#b42318]">{t.dangerZone}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#6b6b6b]">{t.deleteAccountHint}</p>
        <div className="mt-4">
          <DeleteAccountButton locale={locale} />
        </div>
      </section>
    </div>
  );
}
