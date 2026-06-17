import type { Metadata } from "next";

import type { Locale } from "@/lib/translations";
import { fineArtProJoinPath, fineArtProPath } from "@/lib/fineart-pro-path";

export type FineArtProFaqCopy = { question: string; answer: string };

export type FineArtProCopy = {
  productName: string;
  meta: { title: string; description: string; ogTitle: string; ogDescription: string };
  heroImageAlt: string;
  moonriseImageAlt: string;
  heroH1: string;
  heroBullets: readonly string[];
  yearlyPlan: string;
  monthlyPlan: string;
  yearlyPrice: string;
  yearlyBilling: string;
  monthlyPrice: string;
  monthlyBilling: string;
  cta: string;
  freshH2: string;
  freshBody: string;
  faq: readonly FineArtProFaqCopy[];
  joinMeta: { title: string; description: string };
  joinEyebrow: string;
  joinH1: string;
  joinIntro: string;
  joinAuthError: string;
  joinBack: string;
  joinAuth: {
    choosePlanFirst: string;
    selectedPlan: (plan: "yearly" | "monthly") => string;
    pickPlanHint: string;
    signedInAs: (email: string) => string;
    continueCheckout: string;
    choosePlanOnLanding: string;
    continueGoogle: string;
    or: string;
    emailPlaceholder: string;
    emailLink: string;
    checkEmail: string;
    unexpectedResponse: string;
    checkoutFailed: string;
    noCheckoutUrl: string;
    planYearly: string;
    planMonthly: string;
  };
  successH1: string;
  successBody: string;
  successBrowse: string;
};

const en: FineArtProCopy = {
  productName: "Fine Art Pro",
  meta: {
    title: "Fine Art Pro",
    description:
      "Get full access to hi-res images. Access over 400,000 paintings, drawings, posters and illustrations at the highest resolution available.",
    ogTitle: "Fine Art Pro — Hi-res public domain art",
    ogDescription:
      "Download images at the highest resolution available. Free from copyright restrictions and ready for your projects.",
  },
  heroImageAlt:
    "Wanderer above the Sea of Fog by Caspar David Friedrich, circa 1818",
  moonriseImageAlt:
    "Oil painting Moonrise over the Sea by Caspar David Friedrich, showing three figures on rocks by the shore watching sailing ships at twilight",
  heroH1: "Get Full Access to Hi-Res Images",
  heroBullets: [
    "Access over 400,000 paintings, drawings, posters and illustrations",
    "Download images at the highest resolution available",
    "Free from copyright restrictions and ready to be used in your projects.",
    "Unlimited AI insights on every artwork",
    "Unlock personalized museum visit guides",
  ],
  yearlyPlan: "Yearly Plan",
  monthlyPlan: "Monthly Plan",
  yearlyPrice: "$7.99 USD /mo",
  yearlyBilling: "$95.88 Every 12 Months",
  monthlyPrice: "$9.99 USD /mo",
  monthlyBilling: "$9.99 Every Month",
  cta: "Get Fine Art Pro",
  freshH2: "Fresh Content Every Month",
  freshBody:
    "Our ever-growing library is constantly updated with the latest public domain discoveries from the archives of some of the best museums and libraries in the world.",
  faq: [
    {
      question: "What do I get with a Fine Art Pro subscription?",
      answer: "You get access to the highest resolution image we have of each artwork.",
    },
    {
      question: "What can I use the images for?",
      answer:
        "All downloadable images are in the public domain, so you can use them for whatever you like.",
    },
    {
      question: "Is my subscription recurring?",
      answer:
        "Yes. You will be charged $9.99 every month or $95.88 every year on a yearly plan until you cancel. You can cancel at any time.",
    },
    {
      question: "How do I cancel my subscription?",
      answer:
        "Cancel from your profile page: open the Subscriptions tab and click Cancel. Your subscription stays active until the end of the period you paid for (monthly or yearly).",
    },
  ],
  joinMeta: {
    title: "Join Fine Art Pro",
    description:
      "Create an account to subscribe to Fine Art Pro and download high-resolution artwork.",
  },
  joinEyebrow: "Fine Art Pro",
  joinH1: "Sign in or register",
  joinIntro:
    "Use Google or your email. After you sign in, you can continue to secure Stripe checkout for your plan.",
  joinAuthError: "Something went wrong signing you in. Please try again.",
  joinBack: "Back to Fine Art Pro",
  joinAuth: {
    choosePlanFirst: "Choose Monthly or Yearly on the Fine Art Pro page first.",
    selectedPlan: (plan) => `Selected plan: ${plan === "yearly" ? "Yearly" : "Monthly"}`,
    pickPlanHint:
      "Pick a plan on the Fine Art Pro page first, or continue and choose billing in the next step.",
    signedInAs: (email) => `Signed in as ${email}.`,
    continueCheckout: "Continue to secure checkout",
    choosePlanOnLanding: "Go back to Fine Art Pro and choose Monthly or Yearly to continue.",
    continueGoogle: "Continue with Google",
    or: "or",
    emailPlaceholder: "you@example.com",
    emailLink: "Email me a sign-in link",
    checkEmail: "Check your email for a sign-in link.",
    unexpectedResponse: "Unexpected response from server.",
    checkoutFailed: "Checkout could not start.",
    noCheckoutUrl: "No checkout URL returned.",
    planYearly: "Yearly",
    planMonthly: "Monthly",
  },
  successH1: "Welcome to Fine Art Pro!",
  successBody:
    "Your subscription is now active. You can now download all artworks in maximum resolution.",
  successBrowse: "Browse Artworks",
};

const es: FineArtProCopy = {
  ...en,
  meta: {
    title: "Fine Art Pro",
    description:
      "Acceso completo a imágenes en alta resolución. Más de 400.000 pinturas, dibujos, pósters e ilustraciones en la máxima resolución disponible.",
    ogTitle: "Fine Art Pro — Arte de dominio público en alta resolución",
    ogDescription:
      "Descarga imágenes en la máxima resolución. Sin restricciones de copyright y listas para tus proyectos.",
  },
  heroImageAlt: "El caminante sobre el mar de nubes, Caspar David Friedrich, ca. 1818",
  moonriseImageAlt:
    "Óleo Salida de la luna en el mar de Caspar David Friedrich, con tres figuras en la orilla observando barcos al crepúsculo",
  heroH1: "Acceso completo a imágenes en alta resolución",
  heroBullets: [
    "Más de 400.000 pinturas, dibujos, pósters e ilustraciones",
    "Descarga en la máxima resolución disponible",
    "Sin restricciones de copyright; listas para tus proyectos.",
    "Información con IA ilimitada en cada obra",
    "Desbloquea guías personalizadas para tu visita al museo",
  ],
  yearlyPlan: "Plan anual",
  monthlyPlan: "Plan mensual",
  yearlyPrice: "7,99 USD /mes",
  yearlyBilling: "95,88 USD cada 12 meses",
  monthlyPrice: "9,99 USD /mes",
  monthlyBilling: "9,99 USD cada mes",
  cta: "Obtener Fine Art Pro",
  freshH2: "Contenido nuevo cada mes",
  freshBody:
    "Nuestra biblioteca crece constantemente con los últimos descubrimientos de dominio público en archivos de algunos de los mejores museos y bibliotecas del mundo.",
  faq: [
    {
      question: "¿Qué incluye la suscripción a Fine Art Pro?",
      answer: "Acceso a la imagen de máxima resolución que tenemos de cada obra.",
    },
    {
      question: "¿Para qué puedo usar las imágenes?",
      answer:
        "Todas las imágenes descargables son de dominio público; puedes usarlas como quieras.",
    },
    {
      question: "¿La suscripción se renueva automáticamente?",
      answer:
        "Sí. Se cobrará 9,99 USD al mes o 95,88 USD al año en el plan anual hasta que canceles. Puedes cancelar en cualquier momento.",
    },
    {
      question: "¿Cómo cancelo mi suscripción?",
      answer:
        "Desde tu perfil: pestaña Suscripciones y Cancelar. La suscripción sigue activa hasta el final del periodo pagado (mensual o anual).",
    },
  ],
  joinMeta: {
    title: "Unirse a Fine Art Pro",
    description:
      "Crea una cuenta para suscribirte a Fine Art Pro y descargar obras en alta resolución.",
  },
  joinH1: "Iniciar sesión o registrarse",
  joinIntro:
    "Usa Google o tu correo. Tras iniciar sesión, continúa al pago seguro con Stripe para tu plan.",
  joinAuthError: "Hubo un error al iniciar sesión. Inténtalo de nuevo.",
  joinBack: "Volver a Fine Art Pro",
  joinAuth: {
    ...en.joinAuth,
    choosePlanFirst: "Elige plan Mensual o Anual en la página de Fine Art Pro primero.",
    selectedPlan: (plan) => `Plan seleccionado: ${plan === "yearly" ? "Anual" : "Mensual"}`,
    pickPlanHint:
      "Elige un plan en Fine Art Pro primero, o continúa y elige la facturación en el siguiente paso.",
    emailPlaceholder: "tu@ejemplo.com",
    signedInAs: (email) => `Sesión iniciada como ${email}.`,
    continueCheckout: "Continuar al pago seguro",
    choosePlanOnLanding:
      "Vuelve a Fine Art Pro y elige Mensual o Anual para continuar.",
    continueGoogle: "Continuar con Google",
    or: "o",
    emailLink: "Enviarme un enlace de acceso por correo",
    checkEmail: "Revisa tu correo para el enlace de acceso.",
    unexpectedResponse: "Respuesta inesperada del servidor.",
    checkoutFailed: "No se pudo iniciar el pago.",
    noCheckoutUrl: "No se devolvió URL de pago.",
    planYearly: "Anual",
    planMonthly: "Mensual",
  },
  successH1: "¡Bienvenido a Fine Art Pro!",
  successBody:
    "Tu suscripción está activa. Ya puedes descargar todas las obras en resolución máxima.",
  successBrowse: "Explorar obras",
};

const pt: FineArtProCopy = {
  ...es,
  meta: {
    title: "Fine Art Pro",
    description:
      "Acesso total a imagens em alta resolução. Mais de 400.000 pinturas, desenhos, pôsteres e ilustrações na resolução máxima disponível.",
    ogTitle: "Fine Art Pro — Arte de domínio público em alta resolução",
    ogDescription:
      "Baixe imagens na resolução máxima. Sem restrições de copyright e prontas para seus projetos.",
  },
  heroH1: "Acesso total a imagens em alta resolução",
  heroBullets: [
    "Mais de 400.000 pinturas, desenhos, pôsteres e ilustrações",
    "Download na resolução máxima disponível",
    "Sem restrições de copyright; prontas para seus projetos.",
    "Insights com IA ilimitados em cada obra",
    "Desbloqueie guias personalizados para a sua visita ao museu",
  ],
  yearlyPlan: "Plano anual",
  monthlyPlan: "Plano mensal",
  yearlyBilling: "95,88 USD a cada 12 meses",
  monthlyBilling: "9,99 USD por mês",
  cta: "Obter Fine Art Pro",
  freshH2: "Conteúdo novo todo mês",
  freshBody:
    "Nossa biblioteca cresce com as últimas descobertas de domínio público em arquivos dos melhores museus e bibliotecas do mundo.",
  faq: [
    {
      question: "O que inclui a assinatura Fine Art Pro?",
      answer: "Acesso à imagem de resolução máxima que temos de cada obra.",
    },
    {
      question: "Para que posso usar as imagens?",
      answer:
        "Todas as imagens para download são de domínio público; use como quiser.",
    },
    {
      question: "A assinatura é recorrente?",
      answer:
        "Sim. Cobrança de 9,99 USD/mês ou 95,88 USD/ano no plano anual até cancelar. Cancele quando quiser.",
    },
    {
      question: "Como cancelo minha assinatura?",
      answer:
        "No seu perfil: aba Assinaturas e Cancelar. Permanece ativa até o fim do período pago (mensal ou anual).",
    },
  ],
  joinMeta: {
    title: "Assinar Fine Art Pro",
    description:
      "Crie uma conta para assinar o Fine Art Pro e baixar obras em alta resolução.",
  },
  joinH1: "Entrar ou cadastrar-se",
  joinIntro:
    "Use Google ou e-mail. Após entrar, continue ao checkout seguro no Stripe.",
  joinAuthError: "Erro ao entrar. Tente novamente.",
  joinBack: "Voltar ao Fine Art Pro",
  joinAuth: {
    ...es.joinAuth,
    choosePlanFirst: "Escolha Mensal ou Anual na página Fine Art Pro primeiro.",
    selectedPlan: (plan) => `Plano selecionado: ${plan === "yearly" ? "Anual" : "Mensal"}`,
    continueCheckout: "Continuar ao pagamento seguro",
    choosePlanOnLanding:
      "Volte ao Fine Art Pro e escolha Mensal ou Anual para continuar.",
    continueGoogle: "Continuar com Google",
    emailLink: "Enviar link de acesso por e-mail",
    checkEmail: "Verifique seu e-mail para o link de acesso.",
    checkoutFailed: "Não foi possível iniciar o pagamento.",
  },
  successH1: "Bem-vindo ao Fine Art Pro!",
  successBody:
    "Sua assinatura está ativa. Agora você pode baixar todas as obras em resolução máxima.",
  successBrowse: "Explorar obras",
};

const ja: FineArtProCopy = {
  ...en,
  meta: {
    title: "Fine Art Pro",
    description:
      "高解像度画像へのフルアクセス。40万点以上の絵画・素描・ポスター・イラストを最高解像度で利用できます。",
    ogTitle: "Fine Art Pro — 高解像度パブリックドメインアート",
    ogDescription:
      "最高解像度でダウンロード。著作権の制限なく、プロジェクトですぐに使えます。",
  },
  heroH1: "高解像度画像へのフルアクセス",
  heroBullets: [
    "40万点以上の絵画・素描・ポスター・イラスト",
    "利用可能な最高解像度でダウンロード",
    "著作権の制限なく、プロジェクトにすぐ使えます。",
    "すべての作品でAIインサイトを無制限に",
    "美術館訪問のためのパーソナルガイドを解放",
  ],
  yearlyPlan: "年間プラン",
  monthlyPlan: "月額プラン",
  yearlyBilling: "12か月ごとに95.88 USD",
  monthlyBilling: "毎月9.99 USD",
  cta: "Fine Art Proを始める",
  freshH2: "毎月新しいコンテンツ",
  freshBody:
    "世界有数の美術館・図書館のアーカイブから見つかった最新のパブリックドメイン作品を、常にライブラリに追加しています。",
  faq: [
    {
      question: "Fine Art Proのサブスクリプションには何が含まれますか？",
      answer: "各作品について、当サイトが保有する最高解像度の画像にアクセスできます。",
    },
    {
      question: "画像は何に使えますか？",
      answer: "ダウンロードできる画像はすべてパブリックドメインです。用途は自由です。",
    },
    {
      question: "サブスクリプションは自動更新されますか？",
      answer:
        "はい。月額9.99 USD、または年間プランでは年間95.88 USDが、解約するまで請求されます。いつでも解約できます。",
    },
    {
      question: "サブスクリプションを解約するには？",
      answer:
        "プロフィールの「サブスクリプション」タブから解約できます。解約後も、支払済みの期間（月額・年間）の終了までは有効です。",
    },
  ],
  joinMeta: {
    title: "Fine Art Proに参加",
    description: "アカウントを作成してFine Art Proに登録し、高解像度作品をダウンロード。",
  },
  joinH1: "ログインまたは登録",
  joinIntro: "Googleまたはメールでログイン後、Stripeの安全な決済に進めます。",
  joinAuthError: "ログインに失敗しました。もう一度お試しください。",
  joinBack: "Fine Art Proに戻る",
  joinAuth: {
    ...en.joinAuth,
    choosePlanFirst: "先にFine Art Proページで月額または年間プランを選んでください。",
    selectedPlan: (plan) => `選択中のプラン: ${plan === "yearly" ? "年間" : "月額"}`,
    pickPlanHint: "先にプランを選ぶか、次のステップで請求を選択してください。",
    signedInAs: (email) => `${email} でログイン中`,
    continueCheckout: "安全な決済へ進む",
    choosePlanOnLanding: "Fine Art Proに戻り、月額または年間を選んでください。",
    continueGoogle: "Googleで続行",
    or: "または",
    emailLink: "ログインリンクをメールで送る",
    checkEmail: "メールのログインリンクをご確認ください。",
    unexpectedResponse: "サーバーから予期しない応答がありました。",
    checkoutFailed: "決済を開始できませんでした。",
    noCheckoutUrl: "決済URLが返されませんでした。",
    planYearly: "年間",
    planMonthly: "月額",
  },
  successH1: "Fine Art Proへようこそ！",
  successBody: "サブスクリプションが有効になりました。すべての作品を最大解像度でダウンロードできます。",
  successBrowse: "作品を見る",
};

const fr: FineArtProCopy = {
  ...en,
  meta: {
    title: "Fine Art Pro",
    description:
      "Accès complet aux images haute résolution. Plus de 400 000 peintures, dessins, affiches et illustrations en résolution maximale.",
    ogTitle: "Fine Art Pro — Art du domaine public en haute résolution",
    ogDescription:
      "Téléchargez en résolution maximale. Sans restriction de droits d'auteur, prêt pour vos projets.",
  },
  heroH1: "Accès complet aux images haute résolution",
  heroBullets: [
    "Plus de 400 000 peintures, dessins, affiches et illustrations",
    "Téléchargement en résolution maximale disponible",
    "Sans restriction de droits d'auteur, prêtes pour vos projets.",
    "Informations IA illimitées sur chaque œuvre",
    "Débloquez des guides de visite de musée personnalisés",
  ],
  yearlyPlan: "Abonnement annuel",
  monthlyPlan: "Abonnement mensuel",
  yearlyBilling: "95,88 USD tous les 12 mois",
  monthlyBilling: "9,99 USD par mois",
  cta: "Obtenir Fine Art Pro",
  freshH2: "Nouveau contenu chaque mois",
  freshBody:
    "Notre bibliothèque s'enrichit en permanence des dernières découvertes du domaine public dans les archives des plus grands musées et bibliothèques.",
  faq: [
    {
      question: "Que comprend l'abonnement Fine Art Pro ?",
      answer: "L'accès à l'image en plus haute résolution que nous possédons pour chaque œuvre.",
    },
    {
      question: "À quoi puis-je utiliser les images ?",
      answer:
        "Toutes les images téléchargeables sont du domaine public : vous pouvez les utiliser librement.",
    },
    {
      question: "L'abonnement est-il récurrent ?",
      answer:
        "Oui : 9,99 USD/mois ou 95,88 USD/an pour l'abonnement annuel, jusqu'à annulation. Vous pouvez annuler à tout moment.",
    },
    {
      question: "Comment annuler mon abonnement ?",
      answer:
        "Depuis votre profil : onglet Abonnements, puis Annuler. L'abonnement reste actif jusqu'à la fin de la période payée.",
    },
  ],
  joinMeta: {
    title: "Rejoindre Fine Art Pro",
    description:
      "Créez un compte pour vous abonner à Fine Art Pro et télécharger des œuvres en haute résolution.",
  },
  joinH1: "Connexion ou inscription",
  joinIntro:
    "Google ou e-mail. Après connexion, poursuivez vers le paiement sécurisé Stripe.",
  joinAuthError: "Échec de la connexion. Veuillez réessayer.",
  joinBack: "Retour à Fine Art Pro",
  joinAuth: {
    ...en.joinAuth,
    choosePlanFirst: "Choisissez Mensuel ou Annuel sur la page Fine Art Pro d'abord.",
    selectedPlan: (plan) => `Formule : ${plan === "yearly" ? "Annuelle" : "Mensuelle"}`,
    pickPlanHint:
      "Choisissez une formule sur Fine Art Pro, ou continuez pour la facturation à l'étape suivante.",
    signedInAs: (email) => `Connecté en tant que ${email}.`,
    continueCheckout: "Continuer vers le paiement sécurisé",
    choosePlanOnLanding:
      "Retournez à Fine Art Pro et choisissez Mensuel ou Annuel pour continuer.",
    continueGoogle: "Continuer avec Google",
    or: "ou",
    emailLink: "M'envoyer un lien de connexion par e-mail",
    checkEmail: "Consultez votre e-mail pour le lien de connexion.",
    unexpectedResponse: "Réponse inattendue du serveur.",
    checkoutFailed: "Impossible de démarrer le paiement.",
    noCheckoutUrl: "Aucune URL de paiement renvoyée.",
    planYearly: "Annuel",
    planMonthly: "Mensuel",
  },
  successH1: "Bienvenue sur Fine Art Pro !",
  successBody:
    "Votre abonnement est actif. Vous pouvez télécharger toutes les œuvres en résolution maximale.",
  successBrowse: "Parcourir les œuvres",
};

const de: FineArtProCopy = {
  ...en,
  meta: {
    title: "Fine Art Pro",
    description:
      "Voller Zugang zu hochauflösenden Bildern. Über 400.000 Gemälde, Zeichnungen, Poster und Illustrationen in höchster verfügbarer Auflösung.",
    ogTitle: "Fine Art Pro — Gemeinfreie Kunst in hoher Auflösung",
    ogDescription:
      "Downloads in höchster Auflösung. Ohne Urheberrechtsbeschränkungen, bereit für Ihre Projekte.",
  },
  heroH1: "Voller Zugang zu hochauflösenden Bildern",
  heroBullets: [
    "Über 400.000 Gemälde, Zeichnungen, Poster und Illustrationen",
    "Download in höchster verfügbarer Auflösung",
    "Gemeinfrei und sofort in Ihren Projekten nutzbar.",
    "Unbegrenzte KI-Einblicke zu jedem Kunstwerk",
    "Personalisierte Museumsbesuchs-Guides freischalten",
  ],
  yearlyPlan: "Jahresabo",
  monthlyPlan: "Monatsabo",
  yearlyBilling: "95,88 USD alle 12 Monate",
  monthlyBilling: "9,99 USD pro Monat",
  cta: "Fine Art Pro holen",
  freshH2: "Jeden Monat neuer Inhalt",
  freshBody:
    "Unsere Bibliothek wächst ständig mit neuen gemeinfreien Funden aus Archiven der besten Museen und Bibliotheken der Welt.",
  faq: [
    {
      question: "Was bietet ein Fine Art Pro-Abo?",
      answer: "Zugang zum hochaufgelösten Bild, das wir von jedem Werk haben.",
    },
    {
      question: "Wofür darf ich die Bilder nutzen?",
      answer: "Alle Downloads sind gemeinfrei — Sie können sie frei verwenden.",
    },
    {
      question: "Ist das Abo wiederkehrend?",
      answer:
        "Ja: 9,99 USD/Monat oder 95,88 USD/Jahr beim Jahresabo, bis Sie kündigen. Jederzeit kündbar.",
    },
    {
      question: "Wie kündige ich?",
      answer:
        "Im Profil unter Abonnements auf Kündigen. Das Abo bleibt bis Periodenende aktiv.",
    },
  ],
  joinMeta: {
    title: "Fine Art Pro beitreten",
    description:
      "Konto erstellen, Fine Art Pro abonnieren und Kunstwerke in hoher Auflösung laden.",
  },
  joinH1: "Anmelden oder registrieren",
  joinIntro:
    "Mit Google oder E-Mail. Nach der Anmeldung geht es zum sicheren Stripe-Checkout.",
  joinAuthError: "Anmeldung fehlgeschlagen. Bitte erneut versuchen.",
  joinBack: "Zurück zu Fine Art Pro",
  joinAuth: {
    ...en.joinAuth,
    choosePlanFirst: "Wählen Sie zuerst Monats- oder Jahresabo auf der Fine Art Pro-Seite.",
    selectedPlan: (plan) => `Gewähltes Abo: ${plan === "yearly" ? "Jährlich" : "Monatlich"}`,
    pickPlanHint:
      "Plan auf der Fine Art Pro-Seite wählen oder im nächsten Schritt die Abrechnung festlegen.",
    signedInAs: (email) => `Angemeldet als ${email}.`,
    continueCheckout: "Weiter zum sicheren Checkout",
    choosePlanOnLanding:
      "Zurück zu Fine Art Pro und Monats- oder Jahresabo wählen.",
    continueGoogle: "Mit Google fortfahren",
    or: "oder",
    emailLink: "Anmeldelink per E-Mail senden",
    checkEmail: "Prüfen Sie Ihre E-Mail für den Anmeldelink.",
    unexpectedResponse: "Unerwartete Serverantwort.",
    checkoutFailed: "Checkout konnte nicht gestartet werden.",
    noCheckoutUrl: "Keine Checkout-URL erhalten.",
    planYearly: "Jährlich",
    planMonthly: "Monatlich",
  },
  successH1: "Willkommen bei Fine Art Pro!",
  successBody:
    "Ihr Abo ist aktiv. Sie können alle Werke in maximaler Auflösung herunterladen.",
  successBrowse: "Werke durchstöbern",
};

const it: FineArtProCopy = {
  ...en,
  meta: {
    title: "Fine Art Pro",
    description:
      "Accesso completo a immagini ad alta risoluzione. Oltre 400.000 dipinti, disegni, poster e illustrazioni alla massima risoluzione disponibile.",
    ogTitle: "Fine Art Pro — Arte di pubblico dominio in alta risoluzione",
    ogDescription:
      "Scarica alla massima risoluzione. Senza vincoli di copyright, pronte per i tuoi progetti.",
  },
  heroH1: "Accesso completo a immagini ad alta risoluzione",
  heroBullets: [
    "Oltre 400.000 dipinti, disegni, poster e illustrazioni",
    "Download alla massima risoluzione disponibile",
    "Di pubblico dominio, pronte per i tuoi progetti.",
    "Approfondimenti IA illimitati su ogni opera",
    "Sblocca guide personalizzate alla visita del museo",
  ],
  yearlyPlan: "Piano annuale",
  monthlyPlan: "Piano mensile",
  yearlyBilling: "95,88 USD ogni 12 mesi",
  monthlyBilling: "9,99 USD al mese",
  cta: "Ottieni Fine Art Pro",
  freshH2: "Nuovi contenuti ogni mese",
  freshBody:
    "La biblioteca cresce con le ultime scoperte di pubblico dominio negli archivi dei migliori musei e biblioteche.",
  faq: [
    {
      question: "Cosa include l'abbonamento Fine Art Pro?",
      answer: "Accesso all'immagine alla massima risoluzione che abbiamo per ogni opera.",
    },
    {
      question: "Per cosa posso usare le immagini?",
      answer: "Tutte le immagini scaricabili sono di pubblico dominio: uso libero.",
    },
    {
      question: "L'abbonamento è ricorrente?",
      answer:
        "Sì: 9,99 USD/mese o 95,88 USD/anno sul piano annuale, fino a disdetta. Puoi disdire quando vuoi.",
    },
    {
      question: "Come disdico l'abbonamento?",
      answer:
        "Dal profilo: scheda Abbonamenti e Annulla. Resta attivo fino alla fine del periodo pagato.",
    },
  ],
  joinMeta: {
    title: "Iscriviti a Fine Art Pro",
    description:
      "Crea un account per abbonarti a Fine Art Pro e scaricare opere ad alta risoluzione.",
  },
  joinH1: "Accedi o registrati",
  joinIntro:
    "Google o e-mail. Dopo l'accesso, continua al checkout sicuro Stripe.",
  joinAuthError: "Accesso non riuscito. Riprova.",
  joinBack: "Torna a Fine Art Pro",
  joinAuth: {
    ...en.joinAuth,
    choosePlanFirst: "Scegli prima Mensile o Annuale sulla pagina Fine Art Pro.",
    selectedPlan: (plan) => `Piano selezionato: ${plan === "yearly" ? "Annuale" : "Mensile"}`,
    pickPlanHint:
      "Scegli un piano su Fine Art Pro o continua e seleziona la fatturazione al passo successivo.",
    signedInAs: (email) => `Accesso come ${email}.`,
    continueCheckout: "Continua al checkout sicuro",
    choosePlanOnLanding:
      "Torna a Fine Art Pro e scegli Mensile o Annuale per continuare.",
    continueGoogle: "Continua con Google",
    or: "oppure",
    emailLink: "Inviami un link di accesso via e-mail",
    checkEmail: "Controlla la e-mail per il link di accesso.",
    unexpectedResponse: "Risposta imprevista dal server.",
    checkoutFailed: "Impossibile avviare il checkout.",
    noCheckoutUrl: "Nessun URL di checkout restituito.",
    planYearly: "Annuale",
    planMonthly: "Mensile",
  },
  successH1: "Benvenuto in Fine Art Pro!",
  successBody:
    "Il tuo abbonamento è attivo. Puoi scaricare tutte le opere alla massima risoluzione.",
  successBrowse: "Sfoglia opere",
};

const ko: FineArtProCopy = {
  ...en,
  meta: {
    title: "Fine Art Pro",
    description:
      "고해상도 이미지 전체 이용. 40만 점 이상의 회화·소묘·포스터·일러스트를 최고 해상도로 이용하세요.",
    ogTitle: "Fine Art Pro — 고해상도 퍼블릭 도메인 아트",
    ogDescription:
      "최고 해상도로 다운로드. 저작권 제한 없이 프로젝트에 바로 사용할 수 있습니다.",
  },
  heroH1: "고해상도 이미지 전체 이용",
  heroBullets: [
    "40만 점 이상의 회화·소묘·포스터·일러스트",
    "이용 가능한 최고 해상도로 다운로드",
    "저작권 제한 없이 프로젝트에 바로 사용.",
    "모든 작품에 대한 무제한 AI 인사이트",
    "맞춤형 미술관 방문 가이드 잠금 해제",
  ],
  yearlyPlan: "연간 플랜",
  monthlyPlan: "월간 플랜",
  yearlyBilling: "12개월마다 95.88 USD",
  monthlyBilling: "매월 9.99 USD",
  cta: "Fine Art Pro 시작하기",
  freshH2: "매달 새로운 콘텐츠",
  freshBody:
    "세계 최고의 박물관·도서관 아카이브에서 발견된 최신 퍼블릭 도메인 작품을 지속적으로 추가합니다.",
  faq: [
    {
      question: "Fine Art Pro 구독에는 무엇이 포함되나요?",
      answer: "각 작품에 대해 보유한 최고 해상도 이미지에 접근할 수 있습니다.",
    },
    {
      question: "이미지는 어떻게 사용할 수 있나요?",
      answer: "다운로드 가능한 모든 이미지는 퍼블릭 도메인이며 자유롭게 사용할 수 있습니다.",
    },
    {
      question: "구독은 자동 갱신되나요?",
      answer:
        "예. 월 9.99 USD 또는 연간 플랜은 연 95.88 USD가 해지할 때까지 청구됩니다. 언제든 해지할 수 있습니다.",
    },
    {
      question: "구독을 해지하려면?",
      answer:
        "프로필의 구독 탭에서 해지하세요. 해지 후에도 결제한 기간(월/연) 종료까지 유효합니다.",
    },
  ],
  joinMeta: {
    title: "Fine Art Pro 가입",
    description: "계정을 만들고 Fine Art Pro를 구독해 고해상도 작품을 다운로드하세요.",
  },
  joinH1: "로그인 또는 가입",
  joinIntro: "Google 또는 이메일로 로그인한 뒤 Stripe 안전 결제로 진행합니다.",
  joinAuthError: "로그인에 실패했습니다. 다시 시도해 주세요.",
  joinBack: "Fine Art Pro로 돌아가기",
  joinAuth: {
    ...en.joinAuth,
    choosePlanFirst: "먼저 Fine Art Pro 페이지에서 월간 또는 연간 플랜을 선택하세요.",
    selectedPlan: (plan) => `선택한 플랜: ${plan === "yearly" ? "연간" : "월간"}`,
    pickPlanHint: "Fine Art Pro에서 플랜을 선택하거나 다음 단계에서 결제 주기를 선택하세요.",
    signedInAs: (email) => `${email}으로 로그인됨`,
    continueCheckout: "안전한 결제로 계속",
    choosePlanOnLanding: "Fine Art Pro로 돌아가 월간 또는 연간을 선택하세요.",
    continueGoogle: "Google로 계속",
    or: "또는",
    emailLink: "이메일로 로그인 링크 받기",
    checkEmail: "이메일에서 로그인 링크를 확인하세요.",
    unexpectedResponse: "서버에서 예기치 않은 응답이 있습니다.",
    checkoutFailed: "결제를 시작할 수 없습니다.",
    noCheckoutUrl: "결제 URL이 반환되지 않았습니다.",
    planYearly: "연간",
    planMonthly: "월간",
  },
  successH1: "Fine Art Pro에 오신 것을 환영합니다!",
  successBody: "구독이 활성화되었습니다. 모든 작품을 최대 해상도로 다운로드할 수 있습니다.",
  successBrowse: "작품 둘러보기",
};

const ru: FineArtProCopy = {
  ...en,
  meta: {
    title: "Fine Art Pro",
    description:
      "Полный доступ к изображениям в высоком разрешении. Более 400 000 картин, рисунков, плакатов и иллюстраций в максимальном качестве.",
    ogTitle: "Fine Art Pro — Искусство общественного достояния в высоком разрешении",
    ogDescription:
      "Скачивайте в максимальном разрешении. Без ограничений авторского права, готово для ваших проектов.",
  },
  heroH1: "Полный доступ к изображениям в высоком разрешении",
  heroBullets: [
    "Более 400 000 картин, рисунков, плакатов и иллюстраций",
    "Скачивание в максимально доступном разрешении",
    "Общественное достояние — свободно для ваших проектов.",
    "Безлимитные AI-инсайты к каждой работе",
    "Откройте персональные гиды для посещения музея",
  ],
  yearlyPlan: "Годовая подписка",
  monthlyPlan: "Месячная подписка",
  yearlyBilling: "95,88 USD каждые 12 месяцев",
  monthlyBilling: "9,99 USD в месяц",
  cta: "Получить Fine Art Pro",
  freshH2: "Новый контент каждый месяц",
  freshBody:
    "Библиотека постоянно пополняется новыми находками общественного достояния из архивов лучших музеев и библиотек мира.",
  faq: [
    {
      question: "Что даёт подписка Fine Art Pro?",
      answer: "Доступ к изображению в максимальном разрешении, которое у нас есть для каждой работы.",
    },
    {
      question: "Как можно использовать изображения?",
      answer: "Все загружаемые изображения в общественном достоянии — используйте свободно.",
    },
    {
      question: "Подписка продлевается автоматически?",
      answer:
        "Да: 9,99 USD/мес. или 95,88 USD/год по годовому плану, пока не отмените. Отмена в любой момент.",
    },
    {
      question: "Как отменить подписку?",
      answer:
        "В профиле: вкладка «Подписки» → «Отменить». Подписка активна до конца оплаченного периода.",
    },
  ],
  joinMeta: {
    title: "Подключить Fine Art Pro",
    description:
      "Создайте аккаунт, оформите Fine Art Pro и скачивайте произведения в высоком разрешении.",
  },
  joinH1: "Войти или зарегистрироваться",
  joinIntro:
    "Google или e-mail. После входа — безопасная оплата через Stripe.",
  joinAuthError: "Не удалось войти. Попробуйте снова.",
  joinBack: "Назад к Fine Art Pro",
  joinAuth: {
    ...en.joinAuth,
    choosePlanFirst: "Сначала выберите месячный или годовой план на странице Fine Art Pro.",
    selectedPlan: (plan) => `Выбранный план: ${plan === "yearly" ? "Годовой" : "Месячный"}`,
    pickPlanHint:
      "Выберите план на Fine Art Pro или укажите оплату на следующем шаге.",
    signedInAs: (email) => `Вы вошли как ${email}.`,
    continueCheckout: "Перейти к безопасной оплате",
    choosePlanOnLanding:
      "Вернитесь на Fine Art Pro и выберите месячный или годовой план.",
    continueGoogle: "Продолжить с Google",
    or: "или",
    emailLink: "Прислать ссылку для входа на e-mail",
    checkEmail: "Проверьте почту — там ссылка для входа.",
    unexpectedResponse: "Неожиданный ответ сервера.",
    checkoutFailed: "Не удалось начать оплату.",
    noCheckoutUrl: "URL оплаты не получен.",
    planYearly: "Годовой",
    planMonthly: "Месячный",
  },
  successH1: "Добро пожаловать в Fine Art Pro!",
  successBody:
    "Подписка активна. Теперь можно скачивать все произведения в максимальном разрешении.",
  successBrowse: "Смотреть произведения",
};

const zh: FineArtProCopy = {
  ...en,
  meta: {
    title: "Fine Art Pro",
    description:
      "完整访问高分辨率图像。40万+绘画、素描、海报与插图，以最高可用分辨率提供。",
    ogTitle: "Fine Art Pro — 高分辨率公有领域艺术",
    ogDescription:
      "以最高分辨率下载。无版权限制，可直接用于您的项目。",
  },
  heroH1: "完整访问高分辨率图像",
  heroBullets: [
    "40万+绘画、素描、海报与插图",
    "以最高可用分辨率下载",
    "公有领域，可直接用于您的项目。",
    "每件作品的无限 AI 解读",
    "解锁个性化的博物馆参观指南",
  ],
  yearlyPlan: "年付方案",
  monthlyPlan: "月付方案",
  yearlyBilling: "每12个月 95.88 USD",
  monthlyBilling: "每月 9.99 USD",
  cta: "获取 Fine Art Pro",
  freshH2: "每月更新内容",
  freshBody:
    "馆藏持续增加来自世界顶尖博物馆与图书馆档案的最新公有领域发现。",
  faq: [
    {
      question: "Fine Art Pro 订阅包含什么？",
      answer: "可访问我们拥有的每件艺术品最高分辨率图像。",
    },
    {
      question: "图像可用于什么？",
      answer: "所有可下载图像均为公有领域，可自由使用。",
    },
    {
      question: "订阅会自动续费吗？",
      answer:
        "会。月付 9.99 USD，年付方案每年 95.88 USD，直至您取消。可随时取消。",
    },
    {
      question: "如何取消订阅？",
      answer:
        "在个人资料页的「订阅」标签中取消。取消后订阅在已付费周期结束前仍有效。",
    },
  ],
  joinMeta: {
    title: "加入 Fine Art Pro",
    description: "创建账户订阅 Fine Art Pro，下载高分辨率艺术品。",
  },
  joinH1: "登录或注册",
  joinIntro: "使用 Google 或电子邮件登录后，进入 Stripe 安全结账。",
  joinAuthError: "登录失败，请重试。",
  joinBack: "返回 Fine Art Pro",
  joinAuth: {
    ...en.joinAuth,
    choosePlanFirst: "请先在 Fine Art Pro 页面选择月付或年付方案。",
    selectedPlan: (plan) => `已选方案：${plan === "yearly" ? "年付" : "月付"}`,
    pickPlanHint: "先在 Fine Art Pro 选择方案，或在下一步选择计费方式。",
    signedInAs: (email) => `已登录：${email}`,
    continueCheckout: "继续安全结账",
    choosePlanOnLanding: "返回 Fine Art Pro 并选择月付或年付以继续。",
    continueGoogle: "使用 Google 继续",
    or: "或",
    emailLink: "通过电子邮件发送登录链接",
    checkEmail: "请查收电子邮件中的登录链接。",
    unexpectedResponse: "服务器返回意外响应。",
    checkoutFailed: "无法开始结账。",
    noCheckoutUrl: "未返回结账 URL。",
    planYearly: "年付",
    planMonthly: "月付",
  },
  successH1: "欢迎使用 Fine Art Pro！",
  successBody: "订阅已激活。现在可以以最高分辨率下载所有作品。",
  successBrowse: "浏览作品",
};

const FINE_ART_PRO_COPY: Record<Locale, FineArtProCopy> = {
  en,
  es,
  pt,
  ja,
  fr,
  de,
  it,
  ko,
  ru,
  zh,
};

export function getFineArtProT(locale: Locale): FineArtProCopy {
  return FINE_ART_PRO_COPY[locale] ?? en;
}

export function fineArtProMetadata(locale: Locale): Metadata {
  const c = getFineArtProT(locale);
  return {
    title: c.meta.title,
    description: c.meta.description,
    openGraph: {
      title: c.meta.ogTitle,
      description: c.meta.ogDescription,
    },
  };
}

export function fineArtProJoinMetadata(locale: Locale): Metadata {
  const c = getFineArtProT(locale);
  return {
    title: c.joinMeta.title,
    description: c.joinMeta.description,
  };
}

export function fineArtProLandingJoinHref(locale: Locale, plan: "yearly" | "monthly"): string {
  return fineArtProJoinPath(locale, plan);
}

export function fineArtProLandingHref(locale: Locale): string {
  return fineArtProPath(locale);
}
