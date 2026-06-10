"use client";

import { useState } from "react";

import { GuideModal } from "@/components/GuideModal";
import { getGuideTranslations } from "@/lib/guide-translations";

type MuseumGuideBannerProps = {
  museumSlug: string;
  museumName: string;
  locale?: string;
};

export function MuseumGuideBanner({ museumSlug, museumName, locale }: MuseumGuideBannerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const t = getGuideTranslations(locale);

  return (
    <>
      <div className="w-full bg-stone-900 px-8 py-8 md:px-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 max-w-2xl">
            <p className="mb-3 text-xs uppercase tracking-widest text-white/50">{t.banner.eyebrow}</p>
            <h2 className="font-serif text-2xl font-bold leading-tight text-white md:text-4xl">
              {t.banner.heading(museumName)}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/70 md:text-base">{t.banner.subtitle}</p>
          </div>

          <div className="flex w-full shrink-0 flex-col items-stretch md:w-auto md:items-end">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="w-full rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-stone-900 transition-colors hover:bg-white/90 md:w-auto"
            >
              {t.banner.cta}
            </button>
            <p className="mt-2 text-center text-xs text-white/50 md:text-right">{t.banner.ctaSub}</p>
          </div>
        </div>
      </div>

      <GuideModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        museumSlug={museumSlug}
        museumName={museumName}
        locale={locale}
      />
    </>
  );
}
