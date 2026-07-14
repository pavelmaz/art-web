import type { Metadata } from "next";

import type { Locale } from "@/lib/translations";
import { absoluteUrl } from "@/lib/utils";

/** Public contact address, shown on the Contact page in every locale. */
export const CONTACT_EMAIL = "pavelmazuelas@gmail.com";

/** Route for each locale's Contact page (en at root, others prefixed). */
export const CONTACT_PATHS: Record<Locale, string> = {
  en: "/contact",
  es: "/es/contact",
  pt: "/pt/contact",
  ja: "/ja/contact",
  fr: "/fr/contact",
  de: "/de/contact",
  it: "/it/contact",
  ko: "/ko/contact",
  ru: "/ru/contact",
  zh: "/zh/contact",
};

type ContactCopy = {
  title: string;
  body: string;
  reach: string;
  metaDescription: string;
};

const CONTACT: Record<Locale, ContactCopy> = {
  en: {
    title: "Contact us",
    body: "Have a question, feedback, or a licensing enquiry? We'd love to hear from you — reach out any time and we'll get back to you as soon as we can.",
    reach: "You can reach us by email at",
    metaDescription:
      "Get in touch with Fine Art Free. Questions, feedback, and licensing enquiries are always welcome.",
  },
  es: {
    title: "Contáctanos",
    body: "¿Tienes una pregunta, un comentario o una consulta sobre licencias? Nos encantaría saber de ti. Escríbenos cuando quieras y te responderemos lo antes posible.",
    reach: "Puedes escribirnos por correo electrónico a",
    metaDescription:
      "Ponte en contacto con Fine Art Free. Preguntas, comentarios y consultas sobre licencias siempre son bienvenidos.",
  },
  pt: {
    title: "Fale conosco",
    body: "Tem uma pergunta, um comentário ou uma dúvida sobre licenciamento? Adoraríamos ouvir você. Entre em contato a qualquer momento e responderemos assim que possível.",
    reach: "Você pode nos contatar por e-mail em",
    metaDescription:
      "Entre em contato com a Fine Art Free. Perguntas, comentários e dúvidas sobre licenciamento são sempre bem-vindos.",
  },
  ja: {
    title: "お問い合わせ",
    body: "ご質問、ご意見、またはライセンスに関するお問い合わせがございましたら、お気軽にご連絡ください。できるだけ早くご返信いたします。",
    reach: "メールでのご連絡はこちらまで",
    metaDescription:
      "Fine Art Free へのお問い合わせ。ご質問、ご意見、ライセンスに関するお問い合わせをお待ちしております。",
  },
  fr: {
    title: "Contactez-nous",
    body: "Vous avez une question, un commentaire ou une demande de licence ? Nous serions ravis de vous lire. Écrivez-nous à tout moment et nous vous répondrons dès que possible.",
    reach: "Vous pouvez nous joindre par e-mail à",
    metaDescription:
      "Contactez Fine Art Free. Vos questions, commentaires et demandes de licence sont toujours les bienvenus.",
  },
  de: {
    title: "Kontakt",
    body: "Haben Sie eine Frage, Feedback oder eine Anfrage zur Lizenzierung? Wir freuen uns, von Ihnen zu hören. Melden Sie sich jederzeit – wir antworten so schnell wie möglich.",
    reach: "Sie erreichen uns per E-Mail unter",
    metaDescription:
      "Kontaktieren Sie Fine Art Free. Fragen, Feedback und Lizenzanfragen sind jederzeit willkommen.",
  },
  it: {
    title: "Contattaci",
    body: "Hai una domanda, un commento o una richiesta sulle licenze? Ci farebbe piacere sentirti. Scrivici quando vuoi e ti risponderemo il prima possibile.",
    reach: "Puoi contattarci via e-mail all'indirizzo",
    metaDescription:
      "Mettiti in contatto con Fine Art Free. Domande, commenti e richieste sulle licenze sono sempre benvenuti.",
  },
  ko: {
    title: "문의하기",
    body: "질문, 의견 또는 라이선스 문의가 있으신가요? 언제든지 연락해 주세요. 최대한 빠르게 답변드리겠습니다.",
    reach: "이메일로 연락하실 수 있습니다",
    metaDescription:
      "Fine Art Free에 문의하세요. 질문, 의견, 라이선스 문의를 언제나 환영합니다.",
  },
  ru: {
    title: "Свяжитесь с нами",
    body: "Есть вопрос, отзыв или запрос по лицензированию? Будем рады вашему сообщению. Пишите в любое время — мы ответим как можно скорее.",
    reach: "Вы можете написать нам по адресу",
    metaDescription:
      "Свяжитесь с Fine Art Free. Мы всегда рады вопросам, отзывам и запросам по лицензированию.",
  },
  zh: {
    title: "联系我们",
    body: "有任何问题、建议或授权咨询吗？我们很期待收到您的来信。欢迎随时与我们联系，我们会尽快回复您。",
    reach: "您可以通过以下邮箱与我们联系：",
    metaDescription: "联系 Fine Art Free。欢迎随时向我们提出问题、建议或授权咨询。",
  },
};

export function getContactT(locale: Locale): ContactCopy {
  return CONTACT[locale] ?? CONTACT.en;
}

export function contactMetadata(locale: Locale): Metadata {
  const c = getContactT(locale);
  return {
    title: `${c.title} — Fine Art Free`,
    description: c.metaDescription,
    alternates: { canonical: absoluteUrl(CONTACT_PATHS[locale]) },
  };
}
