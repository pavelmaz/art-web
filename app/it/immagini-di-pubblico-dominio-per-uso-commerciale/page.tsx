import type { Metadata } from "next";

import { CommercialUseLanding } from "@/components/CommercialUseLanding";
import { buildCommercialUseAlternates, type CommercialUseCopy } from "@/lib/commercial-use-landing";

export const revalidate = 86400;

const copy: CommercialUseCopy = {
  metaTitle: "Immagini di Pubblico Dominio per Uso Commerciale — 500.000+ Download Gratis | Fine Art Free",
  metaDescription:
    "Scarica 500.000+ immagini di pubblico dominio gratis per uso commerciale: dipinti, arte classica e stampe vintage in alta risoluzione. Vendi stampe, usale su prodotti. Senza attribuzione né costi.",
  eyebrow: "Pubblico dominio · Uso commerciale",
  h1: "Immagini di pubblico dominio per uso commerciale",
  subhead:
    "Esplora oltre 500.000 dipinti di pubblico dominio, immagini d'arte classica e stampe vintage dei più grandi musei del mondo — ogni file gratis da scaricare in alta risoluzione, per uso personale e commerciale. Senza attribuzione, senza costi di licenza, senza account.",
  badges: ["Pubblico dominio", "Uso commerciale", "Senza attribuzione", "Alta risoluzione"],
  searchPlaceholder: "Cerca tra 500.000+ opere per artista o parola chiave",
  searchAria: "Cerca opere per artista o parola chiave",
  searchButtonAria: "Cerca",
  popularLabel: "Popolari:",
  popular: ["van gogh", "ninfee di monet", "stampe botaniche", "xilografia giapponese"],
  useCasesH2: "Cosa puoi creare con esse",
  useCases: [
    { title: "Prodotti print-on-demand", text: "T-shirt, tazze, cover — Etsy, Redbubble, Printful e altro." },
    { title: "Stampe e quadri da parete", text: "Tele, poster e pareti da galleria, stampati in qualsiasi formato." },
    { title: "Copertine di libri e album", text: "Editoria commerciale, autopubblicazione, playlist e podcast." },
    { title: "Packaging e brand", text: "Etichette di prodotto, cartoleria e immagine di marca con vera provenienza." },
    { title: "Editoriale e blog", text: "Articoli, newsletter e social — senza budget per le immagini." },
    { title: "Design web e app", text: "Immagini hero, sfondi e dettagli d'interfaccia dallo stile senza tempo." },
  ],
  downloadH2: "Scarica dipinti famosi in alta risoluzione",
  downloadP:
    "Ogni opera si scarica in alta risoluzione, la maggior parte in 4K o superiore, digitalizzata da originali dei musei. Scarica i paesaggi di Van Gogh, le Ninfee di Monet, i ritratti di Vermeer, Rembrandt, Goya, Renoir, Caravaggio e Turner in qualità di stampa — gratis.",
  featuredH2: "Opere in evidenza, gratis per uso commerciale",
  browseAllCta: "Sfoglia tutte le 500.000+ opere",
  printH2: "Qualità pronta per la stampa",
  printP:
    "I file sono abbastanza grandi per una stampa reale — tele, quadri incorniciati, poster e prodotti print-on-demand. I download gratuiti coprono la maggior parte degli usi; Fine Art Pro sblocca gli originali a grandezza piena in 4K per la stampa di grande formato.",
  whyH2: "Perché queste immagini sono gratis",
  whyP1:
    "Il copyright è scaduto: gli artisti sono morti più di 70 anni fa, il che colloca le loro opere nel pubblico dominio in tutto il mondo. Inoltre il Met, il Rijksmuseum e altri musei pubblicano le loro scansioni in alta risoluzione con accesso aperto CC0.",
  whyP2:
    "L'unica avvertenza da conoscere: marchi registrati o persone viventi riconoscibili all'interno di un'immagine possono comportare diritti separati — raro nell'arte classica, ma è bene saperlo.",
  statK1: "4K",
  statK1Sub: "file originali, scansioni di qualità museale",
  statK2: "500.000+",
  statK2Sub: "opere, cinque secoli d'arte",
  statK3: "0 €",
  statK3Sub: "nessun costo di licenza, nessuna attribuzione — JPG, pronto per il POD",
  categoriesH2: "Categorie popolari",
  categoryLabels: ["Stampe botaniche", "Poster vintage", "Xilografia giapponese", "Paesaggi", "Nature morte", "Ritratti"],
  closingP:
    "Che ti servano dipinti di pubblico dominio per uso commerciale, il download di un dipinto vintage per il progetto di un cliente, o arte classica royalty free per prodotti, ogni immagine di questa collezione è libera da copyright e gratuita. Il catalogo copre cinque secoli di storia dell'arte — dai dipinti dei grandi maestri ai paesaggi impressionisti alle xilografie giapponesi — tutto disponibile come arte in alta risoluzione per stampa, design digitale e rivendita.",
  faqH2: "Domande frequenti",
  faq: [
    {
      q: "Posso vendere stampe o prodotti realizzati con queste immagini?",
      a: "Sì. Le opere di pubblico dominio possono essere usate commercialmente senza restrizioni — inclusa la vendita di stampe, tele e prodotti su Etsy, piattaforme print-on-demand o il tuo negozio.",
    },
    {
      q: "Devo accreditare l'artista o il museo?",
      a: "Nessuna attribuzione è richiesta. Accreditare l'artista è un bel gesto, ma le opere di pubblico dominio non obbligano legalmente a citare nessuno.",
    },
    {
      q: "Posso modificare, ritagliare o remixare le immagini?",
      a: "Liberamente. Puoi ritagliare, ricolorare, combinare e creare opere derivate — i tuoi derivati sono tuoi, da usare e vendere.",
    },
    {
      q: "Perché queste immagini sono gratis? È davvero legale?",
      a: "Gli artisti sono morti più di 70 anni fa, quindi il copyright è scaduto in tutto il mondo. Inoltre musei come il Met e il Rijksmuseum rilasciano le loro scansioni con accesso aperto CC0.",
    },
    {
      q: "Che risoluzione hanno i download?",
      a: "I download standard sono in alta risoluzione e gratuiti. Fine Art Pro sblocca i file originali a grandezza piena — la maggior parte in 4K o superiore — per la stampa di grande formato.",
    },
  ],
  ctaH: "Inizia a scaricare — gratis, per sempre",
  ctaSub: "Nessun account · Originali 4K e download illimitati con Fine Art Pro",
  ctaBrowse: "Esplora le immagini gratis",
  ctaPro: "Fine Art Pro",
  unknownArtist: "Artista sconosciuto",
  altConnector: " di ",
  proHeroAlt: "Dipinti famosi di pubblico dominio, gratis per uso commerciale",
};

export const metadata: Metadata = {
  title: { absolute: copy.metaTitle },
  description: copy.metaDescription,
  alternates: buildCommercialUseAlternates("it"),
  openGraph: { title: copy.metaTitle, description: copy.metaDescription },
};

export default function Page() {
  return <CommercialUseLanding locale="it" copy={copy} />;
}
