import type { Metadata } from "next";

import { CommercialUseLanding } from "@/components/CommercialUseLanding";
import { buildCommercialUseAlternates, type CommercialUseCopy } from "@/lib/commercial-use-landing";

export const revalidate = 86400;

const copy: CommercialUseCopy = {
  metaTitle: "Imágenes de Dominio Público para Uso Comercial — 500.000+ Descargas Gratis | Fine Art Free",
  metaDescription:
    "Descarga 500.000+ imágenes de dominio público gratis para uso comercial: pinturas, arte clásico y láminas vintage en alta resolución. Vende láminas, úsalas en productos. Sin atribución ni tarifas.",
  eyebrow: "Dominio público · Uso comercial",
  h1: "Imágenes de dominio público para uso comercial",
  subhead:
    "Explora más de 500.000 pinturas de dominio público, imágenes de arte clásico y láminas vintage de los grandes museos del mundo — cada archivo gratis para descargar en alta resolución, para uso personal y comercial. Sin atribución, sin tarifas de licencia, sin cuenta.",
  badges: ["Dominio público", "Uso comercial", "Sin atribución", "Alta resolución"],
  searchPlaceholder: "Busca entre 500.000+ obras por artista o palabra clave",
  searchAria: "Buscar obras por artista o palabra clave",
  searchButtonAria: "Buscar",
  popularLabel: "Populares:",
  popular: ["van gogh", "nenúfares de monet", "láminas botánicas", "grabado japonés"],
  useCasesH2: "Qué puedes crear con ellas",
  useCases: [
    { title: "Productos print-on-demand", text: "Camisetas, tazas, fundas — Etsy, Redbubble, Printful y más." },
    { title: "Láminas y cuadros enmarcados", text: "Lienzos, pósters y galerías de pared, impresos a cualquier tamaño." },
    { title: "Portadas de libros y discos", text: "Publicación comercial, autopublicación, playlists y podcasts." },
    { title: "Packaging y marca", text: "Etiquetas de producto, papelería e imagen de marca con procedencia real." },
    { title: "Editorial y blogs", text: "Artículos, newsletters y redes sociales — sin presupuesto de imágenes." },
    { title: "Diseño web y apps", text: "Imágenes de cabecera, fondos y detalles de interfaz con estilo atemporal." },
  ],
  downloadH2: "Descarga pinturas famosas en alta resolución",
  downloadP:
    "Cada obra se descarga en alta resolución, la mayoría en 4K o superior, escaneada de originales de museo. Descarga los paisajes de Van Gogh, los Nenúfares de Monet, los retratos de Vermeer, Rembrandt, Goya, Renoir, Caravaggio y Turner con calidad de impresión — gratis.",
  featuredH2: "Obras destacadas gratis para uso comercial",
  browseAllCta: "Explora las 500.000+ obras",
  printH2: "Calidad lista para imprimir",
  printP:
    "Los archivos son lo bastante grandes para impresión real — lienzos, cuadros enmarcados, pósters y productos print-on-demand. Las descargas gratuitas cubren la mayoría de usos; Fine Art Pro desbloquea los originales a tamaño completo en 4K para impresión en gran formato.",
  whyH2: "Por qué estas imágenes son gratis",
  whyP1:
    "El copyright ha expirado: los artistas murieron hace más de 70 años, lo que sitúa su obra en el dominio público en todo el mundo. Además, el Met, el Rijksmuseum y otros museos publican sus escaneos de alta resolución bajo acceso abierto CC0.",
  whyP2:
    "La única salvedad a tener en cuenta: las marcas registradas o personas vivas reconocibles dentro de una imagen pueden conllevar derechos aparte — algo raro en el arte clásico, pero conviene saberlo.",
  statK1: "4K",
  statK1Sub: "archivos originales, escaneos con calidad de museo",
  statK2: "500.000+",
  statK2Sub: "obras, cinco siglos de arte",
  statK3: "0 €",
  statK3Sub: "sin tarifas de licencia, sin atribución — JPG, listo para POD",
  categoriesH2: "Categorías populares",
  categoryLabels: ["Láminas botánicas", "Pósters vintage", "Grabado japonés", "Paisajes", "Bodegones", "Retratos"],
  closingP:
    "Tanto si necesitas pinturas de dominio público para uso comercial, la descarga de una pintura vintage para el proyecto de un cliente, o arte clásico libre de derechos para productos, cada imagen de esta colección está libre de copyright y es gratuita. El catálogo abarca cinco siglos de historia del arte — de las pinturas de los antiguos maestros a los paisajes impresionistas y los grabados japoneses — todo disponible como arte en alta resolución para impresión, diseño digital y reventa.",
  faqH2: "Preguntas frecuentes",
  faq: [
    {
      q: "¿Puedo vender láminas o productos hechos con estas imágenes?",
      a: "Sí. Las obras de dominio público pueden usarse comercialmente sin restricción, incluida la venta de láminas, lienzos y productos en Etsy, plataformas print-on-demand o tu propia tienda.",
    },
    {
      q: "¿Tengo que dar crédito al artista o al museo?",
      a: "No se requiere atribución. Dar crédito al artista es un buen gesto, pero las obras de dominio público no obligan legalmente a citar a nadie.",
    },
    {
      q: "¿Puedo editar, recortar o modificar las imágenes?",
      a: "Con total libertad. Puedes recortar, cambiar el color, combinar y crear obras derivadas — tus derivados son tuyos para usar y vender.",
    },
    {
      q: "¿Por qué son gratis estas imágenes? ¿Es realmente legal?",
      a: "Los artistas murieron hace más de 70 años, así que el copyright ha expirado en todo el mundo. Además, museos como el Met y el Rijksmuseum publican sus escaneos bajo políticas de acceso abierto CC0.",
    },
    {
      q: "¿Qué resolución tienen las descargas?",
      a: "Las descargas estándar son de alta resolución y gratuitas. Fine Art Pro desbloquea los archivos originales a tamaño completo — la mayoría en 4K o superior — para impresión en gran formato.",
    },
  ],
  ctaH: "Empieza a descargar — gratis, para siempre",
  ctaSub: "Sin cuenta · Originales en 4K y descargas ilimitadas con Fine Art Pro",
  ctaBrowse: "Explorar imágenes gratis",
  ctaPro: "Fine Art Pro",
  unknownArtist: "Artista desconocido",
  altConnector: " de ",
  proHeroAlt: "Pinturas famosas de dominio público, gratis para uso comercial",
};

export const metadata: Metadata = {
  title: { absolute: copy.metaTitle },
  description: copy.metaDescription,
  alternates: buildCommercialUseAlternates("es"),
  openGraph: { title: copy.metaTitle, description: copy.metaDescription },
};

export default function Page() {
  return <CommercialUseLanding locale="es" copy={copy} />;
}
