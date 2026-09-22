import type { Metadata } from "next";

import { FineArtProSuccessPage } from "@/components/FineArtProSuccessPage";
import { resolveFineArtProSuccess } from "@/lib/fineart-pro-success";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Thank you — Fine Art Pro",
  description: "Your Fine Art Pro subscription is active.",
  robots: { index: false, follow: false },
};

type SuccessSearchParams = Promise<{ session_id?: string }>;

export default async function SuccessPage({ searchParams }: { searchParams: SuccessSearchParams }) {
  const { session_id } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { purchase, needsRegistration, prefillEmail } = await resolveFineArtProSuccess(session_id, user);

  const nextPath = session_id
    ? `/fineart-pro/success?session_id=${encodeURIComponent(session_id)}`
    : "/fineart-pro/success";

  return (
    <FineArtProSuccessPage
      locale="en"
      purchase={purchase}
      needsRegistration={needsRegistration}
      nextPath={nextPath}
      prefillEmail={prefillEmail}
    />
  );
}
