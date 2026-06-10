import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GuideDisplay } from "@/components/GuideDisplay";
import { getGuidedVisitByToken } from "@/lib/guided-visit";
import type { GuideData } from "@/lib/guide-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type GuidePageProps = {
  params: Promise<{ museum: string; token: string }>;
};

async function loadGuidedVisit(museum: string, token: string) {
  return getGuidedVisitByToken(museum, token);
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { museum, token } = await params;
  const visit = await loadGuidedVisit(museum, token);

  if (!visit) {
    return { title: "Guide not found | Fine Art Free" };
  }

  const guide = visit.guide_data as GuideData;

  return {
    title: `${guide.title} | Fine Art Free`,
    description: guide.description,
    robots: "noindex",
  };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { museum, token } = await params;
  const visit = await loadGuidedVisit(museum, token);

  if (!visit) {
    notFound();
  }

  const guide = visit.guide_data as GuideData;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-[#111111]">
      <GuideDisplay guide={guide} isLoggedIn={!!user} locale={visit.locale} />
    </div>
  );
}
