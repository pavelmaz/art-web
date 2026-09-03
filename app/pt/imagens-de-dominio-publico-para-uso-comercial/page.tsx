import type { Metadata } from "next";

import { CommercialUseLanding } from "@/components/CommercialUseLanding";
import { buildCommercialUseAlternates, type CommercialUseCopy } from "@/lib/commercial-use-landing";

export const revalidate = 86400;

const copy: CommercialUseCopy = {
  metaTitle: "Imagens de Domínio Público para Uso Comercial — 500.000+ Downloads Grátis | Fine Art Free",
  metaDescription:
    "Baixe 500.000+ imagens de domínio público grátis para uso comercial: pinturas, arte clássica e gravuras vintage em alta resolução. Venda quadros, use em produtos. Sem atribuição nem taxas.",
  eyebrow: "Domínio público · Uso comercial",
  h1: "Imagens de domínio público para uso comercial",
  subhead:
    "Explore mais de 500.000 pinturas de domínio público, imagens de arte clássica e gravuras vintage dos maiores museus do mundo — cada arquivo grátis para baixar em alta resolução, para uso pessoal e comercial. Sem atribuição, sem taxas de licença, sem conta.",
  badges: ["Domínio público", "Uso comercial", "Sem atribuição", "Alta resolução"],
  searchPlaceholder: "Busque entre 500.000+ obras por artista ou palavra-chave",
  searchAria: "Buscar obras por artista ou palavra-chave",
  searchButtonAria: "Buscar",
  popularLabel: "Populares:",
  popular: ["van gogh", "nenúfares de monet", "gravuras botânicas", "gravura japonesa"],
  useCasesH2: "O que você pode criar com elas",
  useCases: [
    { title: "Produtos print-on-demand", text: "Camisetas, canecas, capinhas — Etsy, Redbubble, Printful e mais." },
    { title: "Quadros e pôsteres emoldurados", text: "Telas, pôsteres e paredes de galeria, impressos em qualquer tamanho." },
    { title: "Capas de livros e álbuns", text: "Publicação comercial, autopublicação, playlists e podcasts." },
    { title: "Embalagem e marca", text: "Rótulos de produto, papelaria e imagem de marca com procedência real." },
    { title: "Editorial e blogs", text: "Artigos, newsletters e redes sociais — sem orçamento de imagens." },
    { title: "Design web e apps", text: "Imagens de destaque, fundos e detalhes de interface com estilo atemporal." },
  ],
  downloadH2: "Baixe pinturas famosas em alta resolução",
  downloadP:
    "Cada obra é baixada em alta resolução, a maioria em 4K ou maior, digitalizada de originais de museu. Baixe as paisagens de Van Gogh, os Nenúfares de Monet, os retratos de Vermeer, Rembrandt, Goya, Renoir, Caravaggio e Turner com qualidade de impressão — grátis.",
  featuredH2: "Obras em destaque, grátis para uso comercial",
  browseAllCta: "Explore as 500.000+ obras",
  printH2: "Qualidade pronta para impressão",
  printP:
    "Os arquivos são grandes o suficiente para impressão real — telas, quadros emoldurados, pôsteres e produtos print-on-demand. Os downloads grátis cobrem a maioria dos usos; o Fine Art Pro libera os originais em tamanho completo em 4K para impressão em grande formato.",
  whyH2: "Por que estas imagens são grátis",
  whyP1:
    "O copyright expirou: os artistas morreram há mais de 70 anos, colocando suas obras em domínio público no mundo todo. Além disso, o Met, o Rijksmuseum e outros museus publicam suas digitalizações em alta resolução sob acesso aberto CC0.",
  whyP2:
    "A única ressalva a saber: marcas registradas ou pessoas vivas reconhecíveis dentro de uma imagem podem ter direitos à parte — raro na arte clássica, mas vale saber.",
  statK1: "4K",
  statK1Sub: "arquivos originais, digitalizações com qualidade de museu",
  statK2: "500.000+",
  statK2Sub: "obras, cinco séculos de arte",
  statK3: "R$ 0",
  statK3Sub: "sem taxas de licença, sem atribuição — JPG, pronto para POD",
  categoriesH2: "Categorias populares",
  categoryLabels: ["Gravuras botânicas", "Pôsteres vintage", "Gravura japonesa", "Paisagens", "Naturezas-mortas", "Retratos"],
  closingP:
    "Seja para pinturas de domínio público para uso comercial, o download de uma pintura vintage para o projeto de um cliente, ou arte clássica livre de direitos para produtos, cada imagem desta coleção é livre de copyright e gratuita. O catálogo abrange cinco séculos de história da arte — das pinturas dos grandes mestres às paisagens impressionistas e às gravuras japonesas — tudo disponível como arte em alta resolução para impressão, design digital e revenda.",
  faqH2: "Perguntas frequentes",
  faq: [
    {
      q: "Posso vender quadros ou produtos feitos com estas imagens?",
      a: "Sim. As obras de domínio público podem ser usadas comercialmente sem restrição, incluindo a venda de quadros, telas e produtos na Etsy, plataformas print-on-demand ou na sua própria loja.",
    },
    {
      q: "Preciso creditar o artista ou o museu?",
      a: "Nenhuma atribuição é exigida. Creditar o artista é um gesto gentil, mas as obras de domínio público não obrigam legalmente a citar ninguém.",
    },
    {
      q: "Posso editar, recortar ou remixar as imagens?",
      a: "Livremente. Você pode recortar, recolorir, combinar e criar obras derivadas — seus derivados são seus para usar e vender.",
    },
    {
      q: "Por que estas imagens são grátis? É realmente legal?",
      a: "Os artistas morreram há mais de 70 anos, então o copyright expirou no mundo todo. Além disso, museus como o Met e o Rijksmuseum liberam suas digitalizações sob políticas de acesso aberto CC0.",
    },
    {
      q: "Qual a resolução dos downloads?",
      a: "Os downloads padrão são em alta resolução e gratuitos. O Fine Art Pro libera os arquivos originais em tamanho completo — a maioria em 4K ou maior — para impressão em grande formato.",
    },
  ],
  ctaH: "Comece a baixar — grátis, para sempre",
  ctaSub: "Sem conta · Originais em 4K e downloads ilimitados com o Fine Art Pro",
  ctaBrowse: "Explorar imagens grátis",
  ctaPro: "Fine Art Pro",
  unknownArtist: "Artista desconhecido",
  altConnector: " de ",
  proHeroAlt: "Pinturas famosas de domínio público, grátis para uso comercial",
};

export const metadata: Metadata = {
  title: { absolute: copy.metaTitle },
  description: copy.metaDescription,
  alternates: buildCommercialUseAlternates("pt"),
  openGraph: { title: copy.metaTitle, description: copy.metaDescription },
};

export default function Page() {
  return <CommercialUseLanding locale="pt" copy={copy} />;
}
