import { CONTACT_EMAIL, getContactT } from "@/lib/contact-translations";
import type { Locale } from "@/lib/translations";

/** Localized Contact page body. Rendered by each locale's /contact route. */
export function ContactContent({ locale }: { locale: Locale }) {
  const t = getContactT(locale);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-semibold text-[#1a1a1a]">{t.title}</h1>

      <section className="prose prose-sm space-y-6 text-[#4a4a4a]">
        <p>{t.body}</p>
        <p>
          {t.reach}{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-[#1a1a1a] underline underline-offset-2 transition-colors hover:text-[#4CAF50]"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </section>
    </main>
  );
}
