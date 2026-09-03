import type { Metadata } from "next";

import { CommercialUseLanding } from "@/components/CommercialUseLanding";
import { buildCommercialUseAlternates, type CommercialUseCopy } from "@/lib/commercial-use-landing";

export const revalidate = 86400;

const copy: CommercialUseCopy = {
  metaTitle: "Images Libres de Droits pour Usage Commercial — 500 000+ Téléchargements Gratuits | Fine Art Free",
  metaDescription:
    "Téléchargez 500 000+ images libres de droits gratuites pour usage commercial : peintures, art classique et gravures vintage en haute résolution. Vendez des tirages, utilisez sur des produits. Sans attribution ni frais.",
  eyebrow: "Domaine public · Usage commercial",
  h1: "Images libres de droits pour usage commercial",
  subhead:
    "Parcourez plus de 500 000 peintures du domaine public, images d'art classique et gravures vintage des plus grands musées du monde — chaque fichier gratuit à télécharger en haute résolution, pour un usage personnel et commercial. Sans attribution, sans frais de licence, sans compte.",
  badges: ["Domaine public", "Usage commercial", "Sans attribution", "Haute résolution"],
  searchPlaceholder: "Cherchez parmi 500 000+ œuvres par artiste ou mot-clé",
  searchAria: "Rechercher des œuvres par artiste ou mot-clé",
  searchButtonAria: "Rechercher",
  popularLabel: "Populaires :",
  popular: ["van gogh", "nymphéas de monet", "gravures botaniques", "estampe japonaise"],
  useCasesH2: "Ce que vous pouvez créer avec",
  useCases: [
    { title: "Produits print-on-demand", text: "T-shirts, mugs, coques — Etsy, Redbubble, Printful et plus." },
    { title: "Tirages et cadres muraux", text: "Toiles, affiches et murs de galerie, imprimés à toute taille." },
    { title: "Couvertures de livres et albums", text: "Édition commerciale, auto-édition, playlists et podcasts." },
    { title: "Packaging et marque", text: "Étiquettes produit, papeterie et image de marque avec une vraie provenance." },
    { title: "Éditorial et blogs", text: "Articles, newsletters et réseaux sociaux — sans budget images." },
    { title: "Design web et applis", text: "Images d'en-tête, arrière-plans et détails d'interface au style intemporel." },
  ],
  downloadH2: "Téléchargez des peintures célèbres en haute résolution",
  downloadP:
    "Chaque œuvre se télécharge en haute résolution, la plupart en 4K ou plus, numérisée à partir d'originaux de musée. Téléchargez les paysages de Van Gogh, les Nymphéas de Monet, les portraits de Vermeer, Rembrandt, Goya, Renoir, Caravage et Turner en qualité d'impression — gratuitement.",
  featuredH2: "Œuvres à la une, gratuites pour usage commercial",
  browseAllCta: "Parcourir les 500 000+ œuvres",
  printH2: "Qualité prête à imprimer",
  printP:
    "Les fichiers sont assez grands pour une vraie impression — toiles, cadres muraux, affiches et produits print-on-demand. Les téléchargements gratuits couvrent la plupart des usages ; Fine Art Pro débloque les originaux pleine taille en 4K pour l'impression grand format.",
  whyH2: "Pourquoi ces images sont gratuites",
  whyP1:
    "Le droit d'auteur a expiré : les artistes sont morts il y a plus de 70 ans, ce qui place leurs œuvres dans le domaine public partout dans le monde. De plus, le Met, le Rijksmuseum et d'autres musées publient leurs numérisations en haute résolution sous licence libre CC0.",
  whyP2:
    "La seule réserve à connaître : marques déposées ou personnes vivantes reconnaissables dans une image peuvent comporter des droits distincts — rare dans l'art classique, mais bon à savoir.",
  statK1: "4K",
  statK1Sub: "fichiers originaux, numérisations de qualité musée",
  statK2: "500 000+",
  statK2Sub: "œuvres, cinq siècles d'art",
  statK3: "0 €",
  statK3Sub: "sans frais de licence, sans attribution — JPG, prêt pour le POD",
  categoriesH2: "Catégories populaires",
  categoryLabels: ["Gravures botaniques", "Affiches vintage", "Estampe japonaise", "Paysages", "Natures mortes", "Portraits"],
  closingP:
    "Que vous cherchiez des peintures du domaine public pour un usage commercial, le téléchargement d'une peinture vintage pour un projet client, ou de l'art classique libre de droits pour des produits, chaque image de cette collection est libre de droits d'auteur et gratuite. Le catalogue couvre cinq siècles d'histoire de l'art — des peintures des grands maîtres aux paysages impressionnistes et aux estampes japonaises — tout disponible en haute résolution pour l'impression, le design numérique et la revente.",
  faqH2: "Questions fréquentes",
  faq: [
    {
      q: "Puis-je vendre des tirages ou produits réalisés avec ces images ?",
      a: "Oui. Les œuvres du domaine public peuvent être utilisées commercialement sans restriction — y compris la vente de tirages, toiles et produits sur Etsy, les plateformes print-on-demand ou votre propre boutique.",
    },
    {
      q: "Dois-je créditer l'artiste ou le musée ?",
      a: "Aucune attribution n'est requise. Créditer l'artiste est un beau geste, mais les œuvres du domaine public n'imposent légalement de citer personne.",
    },
    {
      q: "Puis-je modifier, recadrer ou remixer les images ?",
      a: "Librement. Vous pouvez recadrer, recolorer, combiner et créer des œuvres dérivées — vos dérivés sont à vous, pour les utiliser et les vendre.",
    },
    {
      q: "Pourquoi ces images sont-elles gratuites ? Est-ce vraiment légal ?",
      a: "Les artistes sont morts il y a plus de 70 ans, donc le droit d'auteur a expiré dans le monde entier. De plus, des musées comme le Met et le Rijksmuseum publient leurs numérisations sous licence libre CC0.",
    },
    {
      q: "Quelle est la résolution des téléchargements ?",
      a: "Les téléchargements standard sont en haute résolution et gratuits. Fine Art Pro débloque les fichiers originaux pleine taille — la plupart en 4K ou plus — pour l'impression grand format.",
    },
  ],
  ctaH: "Commencez à télécharger — gratuit, pour toujours",
  ctaSub: "Sans compte · Originaux 4K et téléchargements illimités avec Fine Art Pro",
  ctaBrowse: "Explorer les images gratuites",
  ctaPro: "Fine Art Pro",
  unknownArtist: "Artiste inconnu",
  altConnector: " par ",
  proHeroAlt: "Peintures célèbres du domaine public, gratuites pour usage commercial",
};

export const metadata: Metadata = {
  title: { absolute: copy.metaTitle },
  description: copy.metaDescription,
  alternates: buildCommercialUseAlternates("fr"),
  openGraph: { title: copy.metaTitle, description: copy.metaDescription },
};

export default function Page() {
  return <CommercialUseLanding locale="fr" copy={copy} />;
}
