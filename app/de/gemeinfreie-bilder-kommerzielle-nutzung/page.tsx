import type { Metadata } from "next";

import { CommercialUseLanding } from "@/components/CommercialUseLanding";
import { buildCommercialUseAlternates, type CommercialUseCopy } from "@/lib/commercial-use-landing";

export const revalidate = 86400;

const copy: CommercialUseCopy = {
  metaTitle: "Gemeinfreie Bilder für kommerzielle Nutzung — 500.000+ kostenlose Downloads | Fine Art Free",
  metaDescription:
    "Lade 500.000+ gemeinfreie Bilder kostenlos für die kommerzielle Nutzung herunter: Gemälde, klassische Kunst und Vintage-Drucke in hoher Auflösung. Verkaufe Drucke, nutze sie auf Produkten. Ohne Namensnennung, ohne Gebühren.",
  eyebrow: "Gemeinfrei · Kommerzielle Nutzung",
  h1: "Gemeinfreie Bilder für kommerzielle Nutzung",
  subhead:
    "Durchstöbere über 500.000 gemeinfreie Gemälde, klassische Kunstbilder und Vintage-Drucke aus den größten Museen der Welt — jede Datei kostenlos in hoher Auflösung herunterladbar, für den privaten und kommerziellen Gebrauch. Ohne Namensnennung, ohne Lizenzgebühren, ohne Konto.",
  badges: ["Gemeinfrei", "Kommerzielle Nutzung", "Ohne Namensnennung", "Hohe Auflösung"],
  searchPlaceholder: "Suche in 500.000+ Werken nach Künstler oder Stichwort",
  searchAria: "Werke nach Künstler oder Stichwort suchen",
  searchButtonAria: "Suchen",
  popularLabel: "Beliebt:",
  popular: ["van gogh", "monets seerosen", "botanische drucke", "japanischer holzschnitt"],
  useCasesH2: "Was du damit gestalten kannst",
  useCases: [
    { title: "Print-on-Demand-Produkte", text: "T-Shirts, Tassen, Handyhüllen — Etsy, Redbubble, Printful und mehr." },
    { title: "Wandbilder & gerahmte Drucke", text: "Leinwände, Poster und Galeriewände, in jeder Größe gedruckt." },
    { title: "Buch- & Albumcover", text: "Kommerzielles Verlagswesen, Self-Publishing, Playlists und Podcasts." },
    { title: "Verpackung & Branding", text: "Produktetiketten, Briefpapier und Markenbilder mit echter Herkunft." },
    { title: "Redaktion & Blogs", text: "Artikel, Newsletter und Social Media — ohne Bildbudget." },
    { title: "Web- & App-Design", text: "Hero-Bilder, Hintergründe und UI-Akzente mit zeitlosem Stil." },
  ],
  downloadH2: "Berühmte Gemälde in hoher Auflösung herunterladen",
  downloadP:
    "Jedes Werk gibt es als hochauflösenden Download, die meisten in 4K oder größer, von Museumsoriginalen gescannt. Lade Van Goghs Landschaften, Monets Seerosen, Vermeers Porträts, Rembrandt, Goya, Renoir, Caravaggio und Turner in Druckqualität herunter — kostenlos.",
  featuredH2: "Ausgewählte Werke, kostenlos für kommerzielle Nutzung",
  browseAllCta: "Alle 500.000+ Werke durchsuchen",
  printH2: "Druckfertige Qualität",
  printP:
    "Die Dateien sind groß genug für echten Druck — Leinwände, gerahmte Wandbilder, Poster und Print-on-Demand-Produkte. Kostenlose Downloads decken die meisten Anwendungen ab; Fine Art Pro schaltet die Originale in voller 4K-Größe für den Großformatdruck frei.",
  whyH2: "Warum diese Bilder kostenlos sind",
  whyP1:
    "Das Urheberrecht ist erloschen: Die Künstler sind vor mehr als 70 Jahren gestorben, wodurch ihre Werke weltweit gemeinfrei sind. Zusätzlich veröffentlichen das Met, das Rijksmuseum und andere Museen ihre hochauflösenden Scans unter der offenen CC0-Lizenz.",
  whyP2:
    "Der einzige Vorbehalt: Marken oder erkennbare lebende Personen in einem Bild können eigene Rechte tragen — in der klassischen Kunst selten, aber gut zu wissen.",
  statK1: "4K",
  statK1Sub: "Originaldateien, Scans in Museumsqualität",
  statK2: "500.000+",
  statK2Sub: "Werke, fünf Jahrhunderte Kunst",
  statK3: "0 €",
  statK3Sub: "keine Lizenzgebühren, keine Namensnennung — JPG, bereit für POD",
  categoriesH2: "Beliebte Kategorien",
  categoryLabels: ["Botanische Drucke", "Vintage-Poster", "Japanischer Holzschnitt", "Landschaften", "Stillleben", "Porträts"],
  closingP:
    "Ob du gemeinfreie Gemälde für die kommerzielle Nutzung brauchst, den Download eines Vintage-Gemäldes für ein Kundenprojekt oder lizenzfreie klassische Kunst für Produkte — jedes Bild dieser Sammlung ist urheberrechtsfrei und kostenlos. Der Katalog umfasst fünf Jahrhunderte Kunstgeschichte — von den Gemälden der alten Meister über impressionistische Landschaften bis zu japanischen Holzschnitten — alles verfügbar als hochauflösende Kunst für Druck, digitales Design und Weiterverkauf.",
  faqH2: "Häufige Fragen",
  faq: [
    {
      q: "Darf ich Drucke oder Produkte mit diesen Bildern verkaufen?",
      a: "Ja. Gemeinfreie Werke dürfen ohne Einschränkung kommerziell genutzt werden — einschließlich des Verkaufs von Drucken, Leinwänden und Produkten auf Etsy, Print-on-Demand-Plattformen oder im eigenen Shop.",
    },
    {
      q: "Muss ich den Künstler oder das Museum nennen?",
      a: "Es ist keine Namensnennung erforderlich. Den Künstler zu nennen ist eine schöne Geste, aber bei gemeinfreien Werken besteht keine rechtliche Pflicht, jemanden zu nennen.",
    },
    {
      q: "Darf ich die Bilder bearbeiten, zuschneiden oder remixen?",
      a: "Ganz frei. Du kannst zuschneiden, umfärben, kombinieren und abgeleitete Werke schaffen — deine Bearbeitungen gehören dir, zum Nutzen und Verkauf.",
    },
    {
      q: "Warum sind diese Bilder kostenlos? Ist das wirklich legal?",
      a: "Die Künstler sind vor mehr als 70 Jahren gestorben, daher ist das Urheberrecht weltweit erloschen. Zudem geben Museen wie das Met und das Rijksmuseum ihre Scans unter der offenen CC0-Lizenz frei.",
    },
    {
      q: "Welche Auflösung haben die Downloads?",
      a: "Standard-Downloads sind hochauflösend und kostenlos. Fine Art Pro schaltet die Originaldateien in voller Größe frei — die meisten in 4K oder größer — für den Großformatdruck.",
    },
  ],
  ctaH: "Jetzt herunterladen — kostenlos, für immer",
  ctaSub: "Kein Konto nötig · 4K-Originale und unbegrenzte Downloads mit Fine Art Pro",
  ctaBrowse: "Kostenlose Bilder durchsuchen",
  ctaPro: "Fine Art Pro",
  unknownArtist: "Unbekannter Künstler",
  altConnector: " von ",
  proHeroAlt: "Berühmte gemeinfreie Gemälde, kostenlos für kommerzielle Nutzung",
};

export const metadata: Metadata = {
  title: { absolute: copy.metaTitle },
  description: copy.metaDescription,
  alternates: buildCommercialUseAlternates("de"),
  openGraph: { title: copy.metaTitle, description: copy.metaDescription },
};

export default function Page() {
  return <CommercialUseLanding locale="de" copy={copy} />;
}
