import type { Locale } from "@/lib/translations";

/**
 * Copy for the user library (favourites, collections, account panel).
 * Kept out of lib/translations.ts for the same reason the Pro funnel is —
 * that file is already enormous and this is a self-contained feature.
 */
export type LibraryCopy = {
  // artwork action row
  favourite: string;
  favourited: string;
  collect: string;
  collected: string;
  signInToSave: string;

  // collect modal
  collectTitle: string;
  collectSubtitle: string;
  newCollection: string;
  collectionNamePlaceholder: string;
  create: string;
  cancel: string;
  done: string;
  noCollectionsYet: string;

  // account nav
  accountHome: string;
  accountCollections: string;
  accountDownloads: string;
  accountSubscription: string;
  accountProfile: string;

  // account home
  favourites: string;
  recentFavourites: string;
  noFavourites: string;
  browseArtworks: string;
  yourCollections: string;
  noCollections: string;
  itemCount: (n: number) => string;
  viewAll: string;

  // downloads
  noDownloads: string;
  downloadedOn: string;
  sizeStandard: string;
  sizeMax: string;

  // subscription
  planFree: string;
  planPro: string;
  planFreeBlurb: string;
  planProBlurb: string;
  billedMonthly: string;
  billedYearly: string;
  manageSubscription: string;
  upgradeToPro: string;

  // profile
  emailLabel: string;
  memberSince: string;
  marketingConsent: string;
  marketingConsentHint: string;
  saved: string;
  dangerZone: string;
  deleteAccount: string;
  deleteAccountHint: string;
  deleteConfirmTitle: string;
  deleteConfirmBody: string;
  deleteConfirmType: string;
  deleteForever: string;
};

const en: LibraryCopy = {
  favourite: "Favourite",
  favourited: "Favourited",
  collect: "Collect",
  collected: "Collected",
  signInToSave: "Sign in to save this artwork",

  collectTitle: "Add to collection",
  collectSubtitle: "Group artworks into collections you can come back to.",
  newCollection: "New collection",
  collectionNamePlaceholder: "Collection name",
  create: "Create",
  cancel: "Cancel",
  done: "Done",
  noCollectionsYet: "No collections yet — create your first one below.",

  accountHome: "Home",
  accountCollections: "Collections",
  accountDownloads: "Downloads",
  accountSubscription: "Subscription",
  accountProfile: "Profile",

  favourites: "Favourites",
  recentFavourites: "Recent favourites",
  noFavourites: "You haven't favourited any artwork yet.",
  browseArtworks: "Browse artworks",
  yourCollections: "Your collections",
  noCollections: "No collections yet.",
  itemCount: (n) => (n === 1 ? "1 artwork" : `${n} artworks`),
  viewAll: "View all",

  noDownloads: "No downloads yet.",
  downloadedOn: "Downloaded",
  sizeStandard: "Standard",
  sizeMax: "Max size",

  planFree: "Free",
  planPro: "Fine Art Pro",
  planFreeBlurb: "You're on the free plan — every artwork in standard resolution.",
  planProBlurb: "You have full access to every artwork in maximum resolution.",
  billedMonthly: "Billed monthly",
  billedYearly: "Billed yearly",
  manageSubscription: "Manage subscription",
  upgradeToPro: "Upgrade to Pro",

  emailLabel: "Email",
  memberSince: "Member since",
  marketingConsent: "Email me about new features and offers",
  marketingConsentHint: "Occasional emails only. You can unsubscribe at any time.",
  saved: "Saved",
  dangerZone: "Danger zone",
  deleteAccount: "Delete account",
  deleteAccountHint:
    "Permanently deletes your account, favourites and collections. This cannot be undone.",
  deleteConfirmTitle: "Delete your account?",
  deleteConfirmBody:
    "This permanently deletes your account, favourites, collections and download history. Any active subscription will be cancelled. This cannot be undone.",
  deleteConfirmType: "Type DELETE to confirm",
  deleteForever: "Delete forever",
};

const es: LibraryCopy = {
  ...en,
  favourite: "Favorito",
  favourited: "En favoritos",
  collect: "Coleccionar",
  collected: "En colección",
  signInToSave: "Inicia sesión para guardar esta obra",

  collectTitle: "Añadir a una colección",
  collectSubtitle: "Agrupa obras en colecciones a las que puedas volver.",
  newCollection: "Nueva colección",
  collectionNamePlaceholder: "Nombre de la colección",
  create: "Crear",
  cancel: "Cancelar",
  done: "Hecho",
  noCollectionsYet: "Aún no tienes colecciones: crea la primera abajo.",

  accountHome: "Inicio",
  accountCollections: "Colecciones",
  accountDownloads: "Descargas",
  accountSubscription: "Suscripción",
  accountProfile: "Perfil",

  favourites: "Favoritos",
  recentFavourites: "Favoritos recientes",
  noFavourites: "Aún no has añadido ninguna obra a favoritos.",
  browseArtworks: "Explorar obras",
  yourCollections: "Tus colecciones",
  noCollections: "Aún no hay colecciones.",
  itemCount: (n) => (n === 1 ? "1 obra" : `${n} obras`),
  viewAll: "Ver todo",

  noDownloads: "Aún no hay descargas.",
  downloadedOn: "Descargada",
  sizeStandard: "Estándar",
  sizeMax: "Tamaño máximo",

  planFree: "Gratis",
  planPro: "Fine Art Pro",
  planFreeBlurb: "Estás en el plan gratuito: todas las obras en resolución estándar.",
  planProBlurb: "Tienes acceso completo a todas las obras en máxima resolución.",
  billedMonthly: "Facturación mensual",
  billedYearly: "Facturación anual",
  manageSubscription: "Gestionar suscripción",
  upgradeToPro: "Hazte Pro",

  emailLabel: "Correo electrónico",
  memberSince: "Miembro desde",
  marketingConsent: "Quiero recibir novedades y ofertas por correo",
  marketingConsentHint: "Solo correos ocasionales. Puedes darte de baja cuando quieras.",
  saved: "Guardado",
  dangerZone: "Zona de riesgo",
  deleteAccount: "Eliminar cuenta",
  deleteAccountHint:
    "Elimina permanentemente tu cuenta, favoritos y colecciones. No se puede deshacer.",
  deleteConfirmTitle: "¿Eliminar tu cuenta?",
  deleteConfirmBody:
    "Se eliminarán permanentemente tu cuenta, favoritos, colecciones e historial de descargas. Se cancelará cualquier suscripción activa. No se puede deshacer.",
  deleteConfirmType: "Escribe DELETE para confirmar",
  deleteForever: "Eliminar para siempre",
};

const pt: LibraryCopy = {
  ...en,
  favourite: "Favorito",
  favourited: "Nos favoritos",
  collect: "Colecionar",
  collected: "Na coleção",
  signInToSave: "Entre para guardar esta obra",

  collectTitle: "Adicionar a uma coleção",
  collectSubtitle: "Agrupe obras em coleções às quais possa voltar.",
  newCollection: "Nova coleção",
  collectionNamePlaceholder: "Nome da coleção",
  create: "Criar",
  cancel: "Cancelar",
  done: "Concluído",
  noCollectionsYet: "Ainda sem coleções — crie a primeira abaixo.",

  accountHome: "Início",
  accountCollections: "Coleções",
  accountDownloads: "Downloads",
  accountSubscription: "Assinatura",
  accountProfile: "Perfil",

  favourites: "Favoritos",
  recentFavourites: "Favoritos recentes",
  noFavourites: "Você ainda não adicionou nenhuma obra aos favoritos.",
  browseArtworks: "Explorar obras",
  yourCollections: "Suas coleções",
  noCollections: "Ainda sem coleções.",
  itemCount: (n) => (n === 1 ? "1 obra" : `${n} obras`),
  viewAll: "Ver tudo",

  noDownloads: "Ainda sem downloads.",
  downloadedOn: "Baixada",
  sizeStandard: "Padrão",
  sizeMax: "Tamanho máximo",

  planFree: "Grátis",
  planPro: "Fine Art Pro",
  planFreeBlurb: "Você está no plano gratuito — todas as obras em resolução padrão.",
  planProBlurb: "Você tem acesso total a todas as obras em resolução máxima.",
  billedMonthly: "Cobrança mensal",
  billedYearly: "Cobrança anual",
  manageSubscription: "Gerir assinatura",
  upgradeToPro: "Seja Pro",

  emailLabel: "E-mail",
  memberSince: "Membro desde",
  marketingConsent: "Quero receber novidades e ofertas por e-mail",
  marketingConsentHint: "Apenas e-mails ocasionais. Pode cancelar quando quiser.",
  saved: "Guardado",
  dangerZone: "Zona de risco",
  deleteAccount: "Excluir conta",
  deleteAccountHint:
    "Exclui permanentemente sua conta, favoritos e coleções. Não pode ser desfeito.",
  deleteConfirmTitle: "Excluir sua conta?",
  deleteConfirmBody:
    "Isto exclui permanentemente sua conta, favoritos, coleções e histórico de downloads. Qualquer assinatura ativa será cancelada. Não pode ser desfeito.",
  deleteConfirmType: "Digite DELETE para confirmar",
  deleteForever: "Excluir para sempre",
};

const fr: LibraryCopy = {
  ...en,
  favourite: "Favori",
  favourited: "En favoris",
  collect: "Collectionner",
  collected: "Dans la collection",
  signInToSave: "Connectez-vous pour enregistrer cette œuvre",

  collectTitle: "Ajouter à une collection",
  collectSubtitle: "Regroupez des œuvres dans des collections à retrouver plus tard.",
  newCollection: "Nouvelle collection",
  collectionNamePlaceholder: "Nom de la collection",
  create: "Créer",
  cancel: "Annuler",
  done: "Terminé",
  noCollectionsYet: "Aucune collection pour l'instant — créez la première ci-dessous.",

  accountHome: "Accueil",
  accountCollections: "Collections",
  accountDownloads: "Téléchargements",
  accountSubscription: "Abonnement",
  accountProfile: "Profil",

  favourites: "Favoris",
  recentFavourites: "Favoris récents",
  noFavourites: "Vous n'avez encore mis aucune œuvre en favori.",
  browseArtworks: "Parcourir les œuvres",
  yourCollections: "Vos collections",
  noCollections: "Aucune collection pour l'instant.",
  itemCount: (n) => (n === 1 ? "1 œuvre" : `${n} œuvres`),
  viewAll: "Tout voir",

  noDownloads: "Aucun téléchargement pour l'instant.",
  downloadedOn: "Téléchargée",
  sizeStandard: "Standard",
  sizeMax: "Taille maximale",

  planFree: "Gratuit",
  planPro: "Fine Art Pro",
  planFreeBlurb: "Vous êtes sur l'offre gratuite — toutes les œuvres en résolution standard.",
  planProBlurb: "Vous avez accès à toutes les œuvres en résolution maximale.",
  billedMonthly: "Facturation mensuelle",
  billedYearly: "Facturation annuelle",
  manageSubscription: "Gérer l'abonnement",
  upgradeToPro: "Passer à Pro",

  emailLabel: "E-mail",
  memberSince: "Membre depuis",
  marketingConsent: "M'envoyer les nouveautés et offres par e-mail",
  marketingConsentHint: "E-mails occasionnels uniquement. Désabonnement à tout moment.",
  saved: "Enregistré",
  dangerZone: "Zone sensible",
  deleteAccount: "Supprimer le compte",
  deleteAccountHint:
    "Supprime définitivement votre compte, vos favoris et vos collections. Irréversible.",
  deleteConfirmTitle: "Supprimer votre compte ?",
  deleteConfirmBody:
    "Cela supprime définitivement votre compte, vos favoris, vos collections et votre historique de téléchargements. Tout abonnement actif sera annulé. Irréversible.",
  deleteConfirmType: "Tapez DELETE pour confirmer",
  deleteForever: "Supprimer définitivement",
};

const de: LibraryCopy = {
  ...en,
  favourite: "Favorit",
  favourited: "In Favoriten",
  collect: "Sammeln",
  collected: "In Sammlung",
  signInToSave: "Melden Sie sich an, um dieses Werk zu speichern",

  collectTitle: "Zur Sammlung hinzufügen",
  collectSubtitle: "Fassen Sie Werke in Sammlungen zusammen, zu denen Sie zurückkehren können.",
  newCollection: "Neue Sammlung",
  collectionNamePlaceholder: "Name der Sammlung",
  create: "Erstellen",
  cancel: "Abbrechen",
  done: "Fertig",
  noCollectionsYet: "Noch keine Sammlungen — erstellen Sie unten Ihre erste.",

  accountHome: "Start",
  accountCollections: "Sammlungen",
  accountDownloads: "Downloads",
  accountSubscription: "Abonnement",
  accountProfile: "Profil",

  favourites: "Favoriten",
  recentFavourites: "Neueste Favoriten",
  noFavourites: "Sie haben noch kein Werk zu den Favoriten hinzugefügt.",
  browseArtworks: "Werke entdecken",
  yourCollections: "Ihre Sammlungen",
  noCollections: "Noch keine Sammlungen.",
  itemCount: (n) => (n === 1 ? "1 Werk" : `${n} Werke`),
  viewAll: "Alle ansehen",

  noDownloads: "Noch keine Downloads.",
  downloadedOn: "Heruntergeladen",
  sizeStandard: "Standard",
  sizeMax: "Maximale Größe",

  planFree: "Kostenlos",
  planPro: "Fine Art Pro",
  planFreeBlurb: "Sie nutzen den kostenlosen Plan — alle Werke in Standardauflösung.",
  planProBlurb: "Sie haben vollen Zugriff auf alle Werke in maximaler Auflösung.",
  billedMonthly: "Monatliche Abrechnung",
  billedYearly: "Jährliche Abrechnung",
  manageSubscription: "Abonnement verwalten",
  upgradeToPro: "Pro werden",

  emailLabel: "E-Mail",
  memberSince: "Mitglied seit",
  marketingConsent: "Über Neuigkeiten und Angebote per E-Mail informieren",
  marketingConsentHint: "Nur gelegentliche E-Mails. Jederzeit abbestellbar.",
  saved: "Gespeichert",
  dangerZone: "Gefahrenbereich",
  deleteAccount: "Konto löschen",
  deleteAccountHint:
    "Löscht Ihr Konto, Ihre Favoriten und Sammlungen dauerhaft. Kann nicht rückgängig gemacht werden.",
  deleteConfirmTitle: "Konto wirklich löschen?",
  deleteConfirmBody:
    "Dies löscht Ihr Konto, Favoriten, Sammlungen und Download-Verlauf dauerhaft. Ein aktives Abonnement wird gekündigt. Kann nicht rückgängig gemacht werden.",
  deleteConfirmType: "Geben Sie DELETE ein, um zu bestätigen",
  deleteForever: "Endgültig löschen",
};

const it: LibraryCopy = {
  ...en,
  favourite: "Preferito",
  favourited: "Nei preferiti",
  collect: "Colleziona",
  collected: "Nella collezione",
  signInToSave: "Accedi per salvare quest'opera",

  collectTitle: "Aggiungi a una collezione",
  collectSubtitle: "Raggruppa le opere in collezioni a cui tornare.",
  newCollection: "Nuova collezione",
  collectionNamePlaceholder: "Nome della collezione",
  create: "Crea",
  cancel: "Annulla",
  done: "Fatto",
  noCollectionsYet: "Ancora nessuna collezione — creane una qui sotto.",

  accountHome: "Home",
  accountCollections: "Collezioni",
  accountDownloads: "Download",
  accountSubscription: "Abbonamento",
  accountProfile: "Profilo",

  favourites: "Preferiti",
  recentFavourites: "Preferiti recenti",
  noFavourites: "Non hai ancora aggiunto opere ai preferiti.",
  browseArtworks: "Esplora le opere",
  yourCollections: "Le tue collezioni",
  noCollections: "Ancora nessuna collezione.",
  itemCount: (n) => (n === 1 ? "1 opera" : `${n} opere`),
  viewAll: "Vedi tutto",

  noDownloads: "Ancora nessun download.",
  downloadedOn: "Scaricata",
  sizeStandard: "Standard",
  sizeMax: "Dimensione massima",

  planFree: "Gratuito",
  planPro: "Fine Art Pro",
  planFreeBlurb: "Sei sul piano gratuito — tutte le opere in risoluzione standard.",
  planProBlurb: "Hai accesso completo a tutte le opere alla massima risoluzione.",
  billedMonthly: "Fatturazione mensile",
  billedYearly: "Fatturazione annuale",
  manageSubscription: "Gestisci abbonamento",
  upgradeToPro: "Passa a Pro",

  emailLabel: "Email",
  memberSince: "Membro dal",
  marketingConsent: "Inviami novità e offerte via email",
  marketingConsentHint: "Solo email occasionali. Puoi disiscriverti quando vuoi.",
  saved: "Salvato",
  dangerZone: "Zona di rischio",
  deleteAccount: "Elimina account",
  deleteAccountHint:
    "Elimina definitivamente account, preferiti e collezioni. Non è reversibile.",
  deleteConfirmTitle: "Eliminare il tuo account?",
  deleteConfirmBody:
    "Questo elimina definitivamente account, preferiti, collezioni e cronologia dei download. Ogni abbonamento attivo sarà annullato. Non è reversibile.",
  deleteConfirmType: "Digita DELETE per confermare",
  deleteForever: "Elimina per sempre",
};

const ja: LibraryCopy = {
  ...en,
  favourite: "お気に入り",
  favourited: "お気に入り済み",
  collect: "コレクト",
  collected: "コレクション済み",
  signInToSave: "この作品を保存するにはログインしてください",

  collectTitle: "コレクションに追加",
  collectSubtitle: "作品をコレクションにまとめて、いつでも見返せます。",
  newCollection: "新しいコレクション",
  collectionNamePlaceholder: "コレクション名",
  create: "作成",
  cancel: "キャンセル",
  done: "完了",
  noCollectionsYet: "コレクションはまだありません — 下から作成できます。",

  accountHome: "ホーム",
  accountCollections: "コレクション",
  accountDownloads: "ダウンロード",
  accountSubscription: "サブスクリプション",
  accountProfile: "プロフィール",

  favourites: "お気に入り",
  recentFavourites: "最近のお気に入り",
  noFavourites: "まだお気に入りの作品がありません。",
  browseArtworks: "作品を見る",
  yourCollections: "あなたのコレクション",
  noCollections: "コレクションはまだありません。",
  itemCount: (n) => `${n}点の作品`,
  viewAll: "すべて見る",

  noDownloads: "ダウンロード履歴はまだありません。",
  downloadedOn: "ダウンロード日",
  sizeStandard: "標準",
  sizeMax: "最大サイズ",

  planFree: "無料",
  planPro: "Fine Art Pro",
  planFreeBlurb: "現在は無料プランです — すべての作品を標準解像度で利用できます。",
  planProBlurb: "すべての作品を最大解像度で利用できます。",
  billedMonthly: "月額課金",
  billedYearly: "年額課金",
  manageSubscription: "サブスクリプションを管理",
  upgradeToPro: "Proにアップグレード",

  emailLabel: "メールアドレス",
  memberSince: "登録日",
  marketingConsent: "新機能やお得な情報をメールで受け取る",
  marketingConsentHint: "配信は時々のみ。いつでも配信停止できます。",
  saved: "保存しました",
  dangerZone: "危険な操作",
  deleteAccount: "アカウントを削除",
  deleteAccountHint: "アカウント、お気に入り、コレクションを完全に削除します。元に戻せません。",
  deleteConfirmTitle: "アカウントを削除しますか？",
  deleteConfirmBody:
    "アカウント、お気に入り、コレクション、ダウンロード履歴を完全に削除します。有効なサブスクリプションは解約されます。元に戻せません。",
  deleteConfirmType: "確認のため DELETE と入力してください",
  deleteForever: "完全に削除",
};

const ko: LibraryCopy = {
  ...en,
  favourite: "즐겨찾기",
  favourited: "즐겨찾기됨",
  collect: "컬렉션",
  collected: "컬렉션에 추가됨",
  signInToSave: "이 작품을 저장하려면 로그인하세요",

  collectTitle: "컬렉션에 추가",
  collectSubtitle: "작품을 컬렉션으로 묶어 언제든 다시 볼 수 있습니다.",
  newCollection: "새 컬렉션",
  collectionNamePlaceholder: "컬렉션 이름",
  create: "만들기",
  cancel: "취소",
  done: "완료",
  noCollectionsYet: "아직 컬렉션이 없습니다 — 아래에서 만들어 보세요.",

  accountHome: "홈",
  accountCollections: "컬렉션",
  accountDownloads: "다운로드",
  accountSubscription: "구독",
  accountProfile: "프로필",

  favourites: "즐겨찾기",
  recentFavourites: "최근 즐겨찾기",
  noFavourites: "아직 즐겨찾기한 작품이 없습니다.",
  browseArtworks: "작품 둘러보기",
  yourCollections: "내 컬렉션",
  noCollections: "아직 컬렉션이 없습니다.",
  itemCount: (n) => `작품 ${n}점`,
  viewAll: "전체 보기",

  noDownloads: "아직 다운로드가 없습니다.",
  downloadedOn: "다운로드일",
  sizeStandard: "표준",
  sizeMax: "최대 크기",

  planFree: "무료",
  planPro: "Fine Art Pro",
  planFreeBlurb: "무료 플랜을 이용 중입니다 — 모든 작품을 표준 해상도로 제공합니다.",
  planProBlurb: "모든 작품을 최대 해상도로 이용할 수 있습니다.",
  billedMonthly: "월간 결제",
  billedYearly: "연간 결제",
  manageSubscription: "구독 관리",
  upgradeToPro: "Pro로 업그레이드",

  emailLabel: "이메일",
  memberSince: "가입일",
  marketingConsent: "새로운 기능과 혜택을 이메일로 받기",
  marketingConsentHint: "가끔만 보냅니다. 언제든 수신을 해지할 수 있습니다.",
  saved: "저장됨",
  dangerZone: "위험 구역",
  deleteAccount: "계정 삭제",
  deleteAccountHint: "계정, 즐겨찾기, 컬렉션이 영구 삭제됩니다. 되돌릴 수 없습니다.",
  deleteConfirmTitle: "계정을 삭제할까요?",
  deleteConfirmBody:
    "계정, 즐겨찾기, 컬렉션, 다운로드 기록이 영구 삭제됩니다. 활성 구독은 취소됩니다. 되돌릴 수 없습니다.",
  deleteConfirmType: "확인하려면 DELETE를 입력하세요",
  deleteForever: "영구 삭제",
};

const ru: LibraryCopy = {
  ...en,
  favourite: "В избранное",
  favourited: "В избранном",
  collect: "В коллекцию",
  collected: "В коллекции",
  signInToSave: "Войдите, чтобы сохранить эту работу",

  collectTitle: "Добавить в коллекцию",
  collectSubtitle: "Группируйте работы в коллекции, к которым можно вернуться.",
  newCollection: "Новая коллекция",
  collectionNamePlaceholder: "Название коллекции",
  create: "Создать",
  cancel: "Отмена",
  done: "Готово",
  noCollectionsYet: "Коллекций пока нет — создайте первую ниже.",

  accountHome: "Главная",
  accountCollections: "Коллекции",
  accountDownloads: "Загрузки",
  accountSubscription: "Подписка",
  accountProfile: "Профиль",

  favourites: "Избранное",
  recentFavourites: "Недавнее избранное",
  noFavourites: "Вы ещё не добавили ни одной работы в избранное.",
  browseArtworks: "Смотреть работы",
  yourCollections: "Ваши коллекции",
  noCollections: "Коллекций пока нет.",
  itemCount: (n) => `${n} работ`,
  viewAll: "Показать все",

  noDownloads: "Загрузок пока нет.",
  downloadedOn: "Загружено",
  sizeStandard: "Стандарт",
  sizeMax: "Максимальный размер",

  planFree: "Бесплатно",
  planPro: "Fine Art Pro",
  planFreeBlurb: "У вас бесплатный план — все работы в стандартном разрешении.",
  planProBlurb: "У вас полный доступ ко всем работам в максимальном разрешении.",
  billedMonthly: "Ежемесячная оплата",
  billedYearly: "Ежегодная оплата",
  manageSubscription: "Управлять подпиской",
  upgradeToPro: "Перейти на Pro",

  emailLabel: "Эл. почта",
  memberSince: "Участник с",
  marketingConsent: "Присылать новости и предложения по эл. почте",
  marketingConsentHint: "Только редкие письма. Отписаться можно в любой момент.",
  saved: "Сохранено",
  dangerZone: "Опасная зона",
  deleteAccount: "Удалить аккаунт",
  deleteAccountHint:
    "Безвозвратно удаляет аккаунт, избранное и коллекции. Отменить нельзя.",
  deleteConfirmTitle: "Удалить аккаунт?",
  deleteConfirmBody:
    "Это безвозвратно удалит аккаунт, избранное, коллекции и историю загрузок. Активная подписка будет отменена. Отменить нельзя.",
  deleteConfirmType: "Введите DELETE для подтверждения",
  deleteForever: "Удалить навсегда",
};

const zh: LibraryCopy = {
  ...en,
  favourite: "收藏",
  favourited: "已收藏",
  collect: "加入收藏集",
  collected: "已加入收藏集",
  signInToSave: "登录后即可保存这幅作品",

  collectTitle: "添加到收藏集",
  collectSubtitle: "把作品整理进收藏集，随时回来查看。",
  newCollection: "新建收藏集",
  collectionNamePlaceholder: "收藏集名称",
  create: "创建",
  cancel: "取消",
  done: "完成",
  noCollectionsYet: "还没有收藏集 — 在下方创建第一个。",

  accountHome: "首页",
  accountCollections: "收藏集",
  accountDownloads: "下载",
  accountSubscription: "订阅",
  accountProfile: "个人资料",

  favourites: "收藏",
  recentFavourites: "最近收藏",
  noFavourites: "你还没有收藏任何作品。",
  browseArtworks: "浏览作品",
  yourCollections: "你的收藏集",
  noCollections: "还没有收藏集。",
  itemCount: (n) => `${n} 幅作品`,
  viewAll: "查看全部",

  noDownloads: "还没有下载记录。",
  downloadedOn: "下载于",
  sizeStandard: "标准",
  sizeMax: "最大尺寸",

  planFree: "免费",
  planPro: "Fine Art Pro",
  planFreeBlurb: "你正在使用免费方案 — 所有作品均提供标准分辨率。",
  planProBlurb: "你可以最高分辨率访问所有作品。",
  billedMonthly: "按月计费",
  billedYearly: "按年计费",
  manageSubscription: "管理订阅",
  upgradeToPro: "升级到 Pro",

  emailLabel: "电子邮箱",
  memberSince: "注册于",
  marketingConsent: "通过邮件接收新功能与优惠信息",
  marketingConsentHint: "仅偶尔发送，可随时取消订阅。",
  saved: "已保存",
  dangerZone: "危险操作",
  deleteAccount: "删除账户",
  deleteAccountHint: "永久删除你的账户、收藏与收藏集，无法撤销。",
  deleteConfirmTitle: "确定删除账户吗？",
  deleteConfirmBody:
    "这将永久删除你的账户、收藏、收藏集与下载记录。任何有效订阅都会被取消。无法撤销。",
  deleteConfirmType: "输入 DELETE 以确认",
  deleteForever: "永久删除",
};

const LIBRARY: Record<Locale, LibraryCopy> = { en, es, pt, fr, de, it, ja, ko, ru, zh };

export function getLibraryT(locale: Locale): LibraryCopy {
  return LIBRARY[locale] ?? en;
}
