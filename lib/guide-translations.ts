import type { Locale } from "@/lib/translations";

export type GuideTranslations = {
  banner: {
    eyebrow: string;
    heading: (museumName: string) => string;
    subtitle: string;
    cta: string;
    ctaSub: string;
  };
  modal: {
    stepLabel: (current: number, total: number) => string;
    closeAriaLabel: string;
    visitTypeHeading: string;
    visitTypes: {
      masterpieces: { label: string; description: string };
      overview: { label: string; description: string };
      in_depth: { label: string; description: string };
    };
    durationHeading: string;
    focusHeading: string;
    focusSubtext: string;
    focusPlaceholder: string;
    focusSkip: string;
    next: string;
    back: string;
    generate: string;
    generating: string[];
    errorRetry: string;
    tryAgain: string;
    focusNotFoundTitle: string;
    focusNotFound: (focus: string, museum: string) => string;
    focusArtistsLabel: string;
    tryDifferent: string;
    generateWithout: string;
  };
  guide: {
    eyebrow: string;
    stopLabel: (order: number, total: number) => string;
    reasonLabel: string;
    showInsights: string;
    hideInsights: string;
    visitTypes: {
      masterpieces: string;
      overview: string;
      in_depth: string;
    };
    stops: string;
    hours: string;
    focus: (value: string) => string;
  };
  loginGate: {
    heading: string;
    subtext: string;
    continueGoogle: string;
    orDivider: string;
    emailPlaceholder: string;
    sendMagicLink: string;
    sending: string;
    checkEmail: string;
  };
};

const en: GuideTranslations = {
  banner: {
    eyebrow: "PERSONALIZED VISIT GUIDE",
    heading: (museumName) => `Plan your visit to ${museumName}`,
    subtitle:
      "Get a custom route through the collection based on your time and interests",
    cta: "Create my guide →",
    ctaSub: "Free · Takes 30 seconds",
  },
  modal: {
    stepLabel: (current, total) => `Step ${current} of ${total}`,
    closeAriaLabel: "Close",
    visitTypeHeading: "What kind of visit?",
    visitTypes: {
      masterpieces: { label: "Highlights", description: "Must-see iconic works" },
      overview: { label: "Overview", description: "A balanced introduction" },
      in_depth: { label: "In Depth", description: "Focused exploration" },
    },
    durationHeading: "How much time do you have?",
    focusHeading: "What would you like to focus on?",
    focusSubtext: "An artist name or movement (e.g. Rembrandt, Baroque)",
    focusPlaceholder: "e.g. Rembrandt, Impressionism",
    focusSkip: "Skip",
    next: "Next →",
    back: "← Back",
    generate: "Generate my guide",
    generating: [
      "Selecting artworks...",
      "Building your route...",
      "Writing insights...",
      "Almost ready...",
    ],
    errorRetry: "Something went wrong. Please try again.",
    tryAgain: "Try again",
    focusNotFoundTitle: "Focus not found",
    focusNotFound: (focus, museum) =>
      `We couldn't find '${focus}' in the ${museum} collection.`,
    focusArtistsLabel: "Artists in this collection include:",
    tryDifferent: "Try a different focus",
    generateWithout: "Generate without focus",
  },
  guide: {
    eyebrow: "Museum Visit Guide",
    stopLabel: (order, total) => `Stop ${order} of ${total}`,
    reasonLabel: "Why this stop is on the route",
    showInsights: "Show guide insights",
    hideInsights: "Hide insights",
    visitTypes: {
      masterpieces: "Highlights",
      overview: "Overview",
      in_depth: "In Depth",
    },
    stops: "stops",
    hours: "h",
    focus: (value) => `Focus: ${value}`,
  },
  loginGate: {
    heading: "Save your guide",
    subtext:
      "Sign in to access your full personalized guide and save it to your account.",
    continueGoogle: "Continue with Google",
    orDivider: "or",
    emailPlaceholder: "you@example.com",
    sendMagicLink: "Email me a sign-in link",
    sending: "Sending...",
    checkEmail: "Check your email for a sign-in link.",
  },
};

const es: GuideTranslations = {
  banner: {
    eyebrow: "GUÍA DE VISITA PERSONALIZADA",
    heading: (museumName) => `Planifica tu visita a ${museumName}`,
    subtitle:
      "Obtén un recorrido a medida por la colección según tu tiempo e intereses",
    cta: "Crear mi guía →",
    ctaSub: "Gratis · 30 segundos",
  },
  modal: {
    stepLabel: (current, total) => `Paso ${current} de ${total}`,
    closeAriaLabel: "Cerrar",
    visitTypeHeading: "¿Qué tipo de visita?",
    visitTypes: {
      masterpieces: { label: "Obras esenciales", description: "Lo imprescindible del museo" },
      overview: { label: "Panorama general", description: "Una introducción equilibrada" },
      in_depth: { label: "En profundidad", description: "Un recorrido con enfoque" },
    },
    durationHeading: "¿Cuánto tiempo tienes?",
    focusHeading: "¿En qué te gustaría centrarte?",
    focusSubtext: "Un artista o movimiento (p. ej. Rembrandt, barroco)",
    focusPlaceholder: "p. ej. Rembrandt, impresionismo",
    focusSkip: "Omitir",
    next: "Siguiente →",
    back: "← Atrás",
    generate: "Generar mi guía",
    generating: [
      "Seleccionando obras...",
      "Diseñando tu recorrido...",
      "Redactando los textos...",
      "Casi listo...",
    ],
    errorRetry: "Algo salió mal. Inténtalo de nuevo.",
    tryAgain: "Reintentar",
    focusNotFoundTitle: "Enfoque no encontrado",
    focusNotFound: (focus, museum) =>
      `No encontramos «${focus}» en la colección de ${museum}.`,
    focusArtistsLabel: "Artistas de esta colección:",
    tryDifferent: "Probar otro enfoque",
    generateWithout: "Generar sin enfoque",
  },
  guide: {
    eyebrow: "Guía de visita",
    stopLabel: (order, total) => `Parada ${order} de ${total}`,
    reasonLabel: "Por qué está en el recorrido",
    showInsights: "Ver los textos de la guía",
    hideInsights: "Ocultar textos",
    visitTypes: {
      masterpieces: "Obras esenciales",
      overview: "Panorama general",
      in_depth: "En profundidad",
    },
    stops: "paradas",
    hours: "h",
    focus: (value) => `Enfoque: ${value}`,
  },
  loginGate: {
    heading: "Guarda tu guía",
    subtext:
      "Inicia sesión para acceder a tu guía personalizada y guardarla en tu cuenta.",
    continueGoogle: "Continuar con Google",
    orDivider: "o",
    emailPlaceholder: "tu@email.com",
    sendMagicLink: "Enviarme un enlace de acceso",
    sending: "Enviando...",
    checkEmail: "Revisa tu correo para el enlace de acceso.",
  },
};

const pt: GuideTranslations = {
  banner: {
    eyebrow: "GUIA DE VISITA PERSONALIZADA",
    heading: (museumName) => `Planeie a sua visita ao ${museumName}`,
    subtitle:
      "Obtenha um percurso à medida pela coleção, conforme o seu tempo e interesses",
    cta: "Criar o meu guia →",
    ctaSub: "Grátis · 30 segundos",
  },
  modal: {
    stepLabel: (current, total) => `Passo ${current} de ${total}`,
    closeAriaLabel: "Fechar",
    visitTypeHeading: "Que tipo de visita?",
    visitTypes: {
      masterpieces: { label: "Destaques", description: "As obras mais emblemáticas" },
      overview: { label: "Visão geral", description: "Uma introdução equilibrada" },
      in_depth: { label: "Em profundidade", description: "Uma exploração focada" },
    },
    durationHeading: "Quanto tempo tem?",
    focusHeading: "Em que gostaria de se focar?",
    focusSubtext: "Um artista ou movimento (ex.: Rembrandt, barroco)",
    focusPlaceholder: "ex.: Rembrandt, impressionismo",
    focusSkip: "Saltar",
    next: "Seguinte →",
    back: "← Voltar",
    generate: "Gerar o meu guia",
    generating: [
      "A selecionar obras...",
      "A construir o percurso...",
      "A redigir os textos...",
      "Quase pronto...",
    ],
    errorRetry: "Algo correu mal. Tente novamente.",
    tryAgain: "Tentar de novo",
    focusNotFoundTitle: "Foco não encontrado",
    focusNotFound: (focus, museum) =>
      `Não encontrámos «${focus}» na coleção do ${museum}.`,
    focusArtistsLabel: "Artistas desta coleção:",
    tryDifferent: "Tentar outro foco",
    generateWithout: "Gerar sem foco",
  },
  guide: {
    eyebrow: "Guia de visita",
    stopLabel: (order, total) => `Paragem ${order} de ${total}`,
    reasonLabel: "Porque está no percurso",
    showInsights: "Ver textos do guia",
    hideInsights: "Ocultar textos",
    visitTypes: {
      masterpieces: "Destaques",
      overview: "Visão geral",
      in_depth: "Em profundidade",
    },
    stops: "paragens",
    hours: "h",
    focus: (value) => `Foco: ${value}`,
  },
  loginGate: {
    heading: "Guarde o seu guia",
    subtext:
      "Inicie sessão para aceder ao seu guia personalizado e guardá-lo na sua conta.",
    continueGoogle: "Continuar com Google",
    orDivider: "ou",
    emailPlaceholder: "seu@email.com",
    sendMagicLink: "Enviar-me um link de acesso",
    sending: "A enviar...",
    checkEmail: "Verifique o seu email para o link de acesso.",
  },
};

const fr: GuideTranslations = {
  banner: {
    eyebrow: "GUIDE DE VISITE PERSONNALISÉ",
    heading: (museumName) => `Préparez votre visite au ${museumName}`,
    subtitle:
      "Obtenez un parcours sur mesure dans les collections, selon votre temps et vos envies",
    cta: "Créer mon guide →",
    ctaSub: "Gratuit · 30 secondes",
  },
  modal: {
    stepLabel: (current, total) => `Étape ${current} sur ${total}`,
    closeAriaLabel: "Fermer",
    visitTypeHeading: "Quel type de visite ?",
    visitTypes: {
      masterpieces: { label: "Incontournables", description: "Les œuvres emblématiques" },
      overview: { label: "Panorama", description: "Une introduction équilibrée" },
      in_depth: { label: "Approfondie", description: "Une exploration ciblée" },
    },
    durationHeading: "Combien de temps avez-vous ?",
    focusHeading: "Sur quoi souhaitez-vous vous concentrer ?",
    focusSubtext: "Un artiste ou un courant (ex. Rembrandt, baroque)",
    focusPlaceholder: "ex. Rembrandt, impressionnisme",
    focusSkip: "Passer",
    next: "Suivant →",
    back: "← Retour",
    generate: "Générer mon guide",
    generating: [
      "Sélection des œuvres...",
      "Construction du parcours...",
      "Rédaction des textes...",
      "Presque prêt...",
    ],
    errorRetry: "Une erreur s'est produite. Veuillez réessayer.",
    tryAgain: "Réessayer",
    focusNotFoundTitle: "Thème introuvable",
    focusNotFound: (focus, museum) =>
      `Nous n'avons pas trouvé « ${focus} » dans les collections du ${museum}.`,
    focusArtistsLabel: "Artistes présents dans cette collection :",
    tryDifferent: "Essayer un autre thème",
    generateWithout: "Générer sans thème",
  },
  guide: {
    eyebrow: "Guide de visite",
    stopLabel: (order, total) => `Étape ${order} sur ${total}`,
    reasonLabel: "Pourquoi cette étape",
    showInsights: "Afficher les textes du guide",
    hideInsights: "Masquer les textes",
    visitTypes: {
      masterpieces: "Incontournables",
      overview: "Panorama",
      in_depth: "Approfondie",
    },
    stops: "étapes",
    hours: "h",
    focus: (value) => `Thème : ${value}`,
  },
  loginGate: {
    heading: "Enregistrez votre guide",
    subtext:
      "Connectez-vous pour accéder à votre guide personnalisé et l'enregistrer sur votre compte.",
    continueGoogle: "Continuer avec Google",
    orDivider: "ou",
    emailPlaceholder: "vous@exemple.com",
    sendMagicLink: "Recevoir un lien de connexion",
    sending: "Envoi en cours...",
    checkEmail: "Consultez votre e-mail pour le lien de connexion.",
  },
};

const de: GuideTranslations = {
  banner: {
    eyebrow: "PERSONALISIERTER BESUCHSFÜHRER",
    heading: (museumName) => `Planen Sie Ihren Besuch im ${museumName}`,
    subtitle:
      "Erhalten Sie eine individuelle Route durch die Sammlung — nach Zeit und Interessen",
    cta: "Meinen Führer erstellen →",
    ctaSub: "Kostenlos · 30 Sekunden",
  },
  modal: {
    stepLabel: (current, total) => `Schritt ${current} von ${total}`,
    closeAriaLabel: "Schließen",
    visitTypeHeading: "Welche Art von Besuch?",
    visitTypes: {
      masterpieces: { label: "Höhepunkte", description: "Die wichtigsten Werke" },
      overview: { label: "Überblick", description: "Ein ausgewogener Einstieg" },
      in_depth: { label: "Vertiefend", description: "Gezielte Erkundung" },
    },
    durationHeading: "Wie viel Zeit haben Sie?",
    focusHeading: "Worauf möchten Sie den Fokus legen?",
    focusSubtext: "Ein Künstler oder eine Richtung (z. B. Rembrandt, Barock)",
    focusPlaceholder: "z. B. Rembrandt, Impressionismus",
    focusSkip: "Überspringen",
    next: "Weiter →",
    back: "← Zurück",
    generate: "Führer erstellen",
    generating: [
      "Werke werden ausgewählt...",
      "Route wird erstellt...",
      "Texte werden geschrieben...",
      "Fast fertig...",
    ],
    errorRetry: "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.",
    tryAgain: "Erneut versuchen",
    focusNotFoundTitle: "Schwerpunkt nicht gefunden",
    focusNotFound: (focus, museum) =>
      `«${focus}» wurde in der Sammlung des ${museum} nicht gefunden.`,
    focusArtistsLabel: "Künstler in dieser Sammlung:",
    tryDifferent: "Anderen Schwerpunkt wählen",
    generateWithout: "Ohne Schwerpunkt erstellen",
  },
  guide: {
    eyebrow: "Museumsführer",
    stopLabel: (order, total) => `Stopp ${order} von ${total}`,
    reasonLabel: "Warum dieser Stopp",
    showInsights: "Führertexte anzeigen",
    hideInsights: "Texte ausblenden",
    visitTypes: {
      masterpieces: "Höhepunkte",
      overview: "Überblick",
      in_depth: "Vertiefend",
    },
    stops: "Stopps",
    hours: "Std.",
    focus: (value) => `Schwerpunkt: ${value}`,
  },
  loginGate: {
    heading: "Führer speichern",
    subtext:
      "Melden Sie sich an, um Ihren persönlichen Führer zu nutzen und in Ihrem Konto zu speichern.",
    continueGoogle: "Mit Google fortfahren",
    orDivider: "oder",
    emailPlaceholder: "sie@beispiel.de",
    sendMagicLink: "Anmeldelink per E-Mail senden",
    sending: "Wird gesendet...",
    checkEmail: "Prüfen Sie Ihre E-Mail für den Anmeldelink.",
  },
};

const it: GuideTranslations = {
  banner: {
    eyebrow: "GUIDA ALLA VISITA PERSONALIZZATA",
    heading: (museumName) => `Pianifica la visita al ${museumName}`,
    subtitle:
      "Ottieni un percorso su misura nella collezione, in base al tempo e ai tuoi interessi",
    cta: "Crea la mia guida →",
    ctaSub: "Gratuito · 30 secondi",
  },
  modal: {
    stepLabel: (current, total) => `Passo ${current} di ${total}`,
    closeAriaLabel: "Chiudi",
    visitTypeHeading: "Che tipo di visita?",
    visitTypes: {
      masterpieces: { label: "Capolavori", description: "Le opere più iconiche" },
      overview: { label: "Panoramica", description: "Un'introduzione equilibrata" },
      in_depth: { label: "Approfondita", description: "Un'esplorazione mirata" },
    },
    durationHeading: "Quanto tempo hai?",
    focusHeading: "Su cosa vorresti concentrarti?",
    focusSubtext: "Un artista o una corrente (es. Rembrandt, barocco)",
    focusPlaceholder: "es. Rembrandt, impressionismo",
    focusSkip: "Salta",
    next: "Avanti →",
    back: "← Indietro",
    generate: "Genera la mia guida",
    generating: [
      "Selezione delle opere...",
      "Creazione del percorso...",
      "Scrittura dei testi...",
      "Quasi pronto...",
    ],
    errorRetry: "Qualcosa è andato storto. Riprova.",
    tryAgain: "Riprova",
    focusNotFoundTitle: "Focus non trovato",
    focusNotFound: (focus, museum) =>
      `Non abbiamo trovato «${focus}» nella collezione del ${museum}.`,
    focusArtistsLabel: "Artisti in questa collezione:",
    tryDifferent: "Prova un altro focus",
    generateWithout: "Genera senza focus",
  },
  guide: {
    eyebrow: "Guida alla visita",
    stopLabel: (order, total) => `Tappa ${order} di ${total}`,
    reasonLabel: "Perché è nel percorso",
    showInsights: "Mostra i testi della guida",
    hideInsights: "Nascondi i testi",
    visitTypes: {
      masterpieces: "Capolavori",
      overview: "Panoramica",
      in_depth: "Approfondita",
    },
    stops: "tappe",
    hours: "h",
    focus: (value) => `Focus: ${value}`,
  },
  loginGate: {
    heading: "Salva la tua guida",
    subtext:
      "Accedi per consultare la tua guida personalizzata e salvarla nel tuo account.",
    continueGoogle: "Continua con Google",
    orDivider: "oppure",
    emailPlaceholder: "tuo@email.com",
    sendMagicLink: "Inviami un link di accesso",
    sending: "Invio in corso...",
    checkEmail: "Controlla la tua email per il link di accesso.",
  },
};

const ko: GuideTranslations = {
  banner: {
    eyebrow: "맞춤형 관람 가이드",
    heading: (museumName) => `${museumName} 관람 계획하기`,
    subtitle: "시간과 관심사에 맞춘 맞춤형 작품 루트를 받아보세요",
    cta: "가이드 만들기 →",
    ctaSub: "무료 · 30초",
  },
  modal: {
    stepLabel: (current, total) => `${total}단계 중 ${current}단계`,
    closeAriaLabel: "닫기",
    visitTypeHeading: "어떤 관람을 원하시나요?",
    visitTypes: {
      masterpieces: { label: "하이라이트", description: "꼭 봐야 할 대표 작품" },
      overview: { label: "개관", description: "균형 잡힌 소개 코스" },
      in_depth: { label: "심층", description: "주제에 집중한 탐색" },
    },
    durationHeading: "얼마나 시간이 있으신가요?",
    focusHeading: "어떤 주제에 집중하고 싶으신가요?",
    focusSubtext: "작가 이름 또는 화풍 (예: 렘브란트, 바로크)",
    focusPlaceholder: "예: 렘브란트, 인상주의",
    focusSkip: "건너뛰기",
    next: "다음 →",
    back: "← 이전",
    generate: "가이드 생성",
    generating: [
      "작품을 선별하는 중...",
      "루트를 구성하는 중...",
      "해설을 작성하는 중...",
      "거의 완료...",
    ],
    errorRetry: "문제가 발생했습니다. 다시 시도해 주세요.",
    tryAgain: "다시 시도",
    focusNotFoundTitle: "주제를 찾을 수 없음",
    focusNotFound: (focus, museum) =>
      `${museum} 컬렉션에서 '${focus}'를 찾을 수 없습니다.`,
    focusArtistsLabel: "이 컬렉션의 작가:",
    tryDifferent: "다른 주제 시도",
    generateWithout: "주제 없이 생성",
  },
  guide: {
    eyebrow: "박물관 관람 가이드",
    stopLabel: (order, total) => `${total}개 중 ${order}번째`,
    reasonLabel: "이 작품이 포함된 이유",
    showInsights: "가이드 해설 보기",
    hideInsights: "해설 숨기기",
    visitTypes: {
      masterpieces: "하이라이트",
      overview: "개관",
      in_depth: "심층",
    },
    stops: "곳",
    hours: "시간",
    focus: (value) => `주제: ${value}`,
  },
  loginGate: {
    heading: "가이드 저장하기",
    subtext: "로그인하여 맞춤 가이드를 계정에 저장하세요.",
    continueGoogle: "Google로 계속",
    orDivider: "또는",
    emailPlaceholder: "you@example.com",
    sendMagicLink: "로그인 링크 이메일 받기",
    sending: "전송 중...",
    checkEmail: "이메일에서 로그인 링크를 확인하세요.",
  },
};

const zh: GuideTranslations = {
  banner: {
    eyebrow: "个性化参观指南",
    heading: (museumName) => `规划您的${museumName}之行`,
    subtitle: "根据您的时间与兴趣，定制专属馆藏路线",
    cta: "创建我的指南 →",
    ctaSub: "免费 · 约30秒",
  },
  modal: {
    stepLabel: (current, total) => `第 ${current} 步，共 ${total} 步`,
    closeAriaLabel: "关闭",
    visitTypeHeading: "您想要哪种参观方式？",
    visitTypes: {
      masterpieces: { label: "精选杰作", description: "不容错过的标志性作品" },
      overview: { label: "概览", description: "均衡的入门路线" },
      in_depth: { label: "深度", description: "聚焦主题的探索" },
    },
    durationHeading: "您有多少时间？",
    focusHeading: "您想重点关注什么？",
    focusSubtext: "艺术家或流派（如伦勃朗、巴洛克）",
    focusPlaceholder: "如：伦勃朗、印象派",
    focusSkip: "跳过",
    next: "下一步 →",
    back: "← 返回",
    generate: "生成我的指南",
    generating: [
      "正在筛选作品...",
      "正在规划路线...",
      "正在撰写解说...",
      "即将完成...",
    ],
    errorRetry: "出了点问题，请重试。",
    tryAgain: "重试",
    focusNotFoundTitle: "未找到相关主题",
    focusNotFound: (focus, museum) =>
      `在${museum}的馆藏中未找到「${focus}」。`,
    focusArtistsLabel: "本馆藏艺术家包括：",
    tryDifferent: "换一个主题",
    generateWithout: "不设主题，直接生成",
  },
  guide: {
    eyebrow: "博物馆参观指南",
    stopLabel: (order, total) => `第 ${order} 站，共 ${total} 站`,
    reasonLabel: "为何列入此路线",
    showInsights: "查看指南解说",
    hideInsights: "隐藏解说",
    visitTypes: {
      masterpieces: "精选杰作",
      overview: "概览",
      in_depth: "深度",
    },
    stops: "站",
    hours: "小时",
    focus: (value) => `主题：${value}`,
  },
  loginGate: {
    heading: "保存您的指南",
    subtext: "登录后即可完整浏览个性化指南，并保存至您的账户。",
    continueGoogle: "使用 Google 继续",
    orDivider: "或",
    emailPlaceholder: "you@example.com",
    sendMagicLink: "发送登录链接至邮箱",
    sending: "发送中...",
    checkEmail: "请查收邮件中的登录链接。",
  },
};

const ru: GuideTranslations = {
  banner: {
    eyebrow: "ПЕРСОНАЛЬНЫЙ ГИД ПО МУЗЕЮ",
    heading: (museumName) => `Спланируйте визит в ${museumName}`,
    subtitle:
      "Получите маршрут по коллекции с учётом вашего времени и интересов",
    cta: "Создать мой гид →",
    ctaSub: "Бесплатно · 30 секунд",
  },
  modal: {
    stepLabel: (current, total) => `Шаг ${current} из ${total}`,
    closeAriaLabel: "Закрыть",
    visitTypeHeading: "Какой тип визита?",
    visitTypes: {
      masterpieces: { label: "Шедевры", description: "Главные знаковые работы" },
      overview: { label: "Обзор", description: "Сбалансированное знакомство" },
      in_depth: { label: "Углублённо", description: "Тематическое погружение" },
    },
    durationHeading: "Сколько у вас времени?",
    focusHeading: "На чём хотите сосредоточиться?",
    focusSubtext: "Художник или направление (напр. Рембрандт, барокко)",
    focusPlaceholder: "напр. Рембрандт, импрессионизм",
    focusSkip: "Пропустить",
    next: "Далее →",
    back: "← Назад",
    generate: "Создать гид",
    generating: [
      "Подбираем работы...",
      "Строим маршрут...",
      "Пишем тексты...",
      "Почти готово...",
    ],
    errorRetry: "Что-то пошло не так. Попробуйте снова.",
    tryAgain: "Повторить",
    focusNotFoundTitle: "Тема не найдена",
    focusNotFound: (focus, museum) =>
      `В коллекции ${museum} не найдено «${focus}».`,
    focusArtistsLabel: "Художники в этой коллекции:",
    tryDifferent: "Выбрать другую тему",
    generateWithout: "Создать без темы",
  },
  guide: {
    eyebrow: "Гид по музею",
    stopLabel: (order, total) => `Остановка ${order} из ${total}`,
    reasonLabel: "Почему в маршруте",
    showInsights: "Показать тексты гида",
    hideInsights: "Скрыть тексты",
    visitTypes: {
      masterpieces: "Шедевры",
      overview: "Обзор",
      in_depth: "Углублённо",
    },
    stops: "остановок",
    hours: "ч",
    focus: (value) => `Тема: ${value}`,
  },
  loginGate: {
    heading: "Сохраните гид",
    subtext:
      "Войдите, чтобы получить полный доступ к персональному гиду и сохранить его в аккаунте.",
    continueGoogle: "Продолжить с Google",
    orDivider: "или",
    emailPlaceholder: "you@example.com",
    sendMagicLink: "Прислать ссылку для входа",
    sending: "Отправка...",
    checkEmail: "Проверьте почту — там ссылка для входа.",
  },
};

const ja: GuideTranslations = {
  banner: {
    eyebrow: "パーソナル観覧ガイド",
    heading: (museumName) => `${museumName}の観覧を計画する`,
    subtitle: "お持ちの時間と関心に合わせた、コレクションのオーダーメイドルート",
    cta: "ガイドを作成 →",
    ctaSub: "無料 · 約30秒",
  },
  modal: {
    stepLabel: (current, total) => `ステップ ${current} / ${total}`,
    closeAriaLabel: "閉じる",
    visitTypeHeading: "どんな観覧にしますか？",
    visitTypes: {
      masterpieces: { label: "名作ハイライト", description: "必見の象徴的作品" },
      overview: { label: "概観", description: "バランスの取れた入門コース" },
      in_depth: { label: "深掘り", description: "テーマに沿った探索" },
    },
    durationHeading: "どのくらい時間がありますか？",
    focusHeading: "何に焦点を当てたいですか？",
    focusSubtext: "作家名や流派（例：レンブラント、バロック）",
    focusPlaceholder: "例：レンブラント、印象派",
    focusSkip: "スキップ",
    next: "次へ →",
    back: "← 戻る",
    generate: "ガイドを生成",
    generating: [
      "作品を選定中...",
      "ルートを作成中...",
      "解説を執筆中...",
      "もうすぐ完了...",
    ],
    errorRetry: "問題が発生しました。もう一度お試しください。",
    tryAgain: "再試行",
    focusNotFoundTitle: "テーマが見つかりません",
    focusNotFound: (focus, museum) =>
      `${museum}のコレクションに「${focus}」は見つかりませんでした。`,
    focusArtistsLabel: "このコレクションの作家：",
    tryDifferent: "別のテーマを試す",
    generateWithout: "テーマなしで生成",
  },
  guide: {
    eyebrow: "博物館観覧ガイド",
    stopLabel: (order, total) => `${total}箇所中 ${order}番目`,
    reasonLabel: "この作品が選ばれた理由",
    showInsights: "ガイドの解説を表示",
    hideInsights: "解説を隠す",
    visitTypes: {
      masterpieces: "名作ハイライト",
      overview: "概観",
      in_depth: "深掘り",
    },
    stops: "箇所",
    hours: "時間",
    focus: (value) => `テーマ：${value}`,
  },
  loginGate: {
    heading: "ガイドを保存",
    subtext: "ログインしてパーソナルガイドをアカウントに保存しましょう。",
    continueGoogle: "Googleで続行",
    orDivider: "または",
    emailPlaceholder: "you@example.com",
    sendMagicLink: "ログインリンクをメールで受け取る",
    sending: "送信中...",
    checkEmail: "メールのログインリンクをご確認ください。",
  },
};

const GUIDE_COPY: Record<Locale, GuideTranslations> = {
  en,
  es,
  pt,
  fr,
  de,
  it,
  ko,
  zh,
  ru,
  ja,
};

export function getGuideTranslations(locale?: string): GuideTranslations {
  const key = (locale ?? "en") as Locale;
  return GUIDE_COPY[key] ?? en;
}
