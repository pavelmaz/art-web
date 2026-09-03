import type { Metadata } from "next";

import { CommercialUseLanding } from "@/components/CommercialUseLanding";
import { buildCommercialUseAlternates, type CommercialUseCopy } from "@/lib/commercial-use-landing";

export const revalidate = 86400;

const copy: CommercialUseCopy = {
  metaTitle: "商用利用OKのパブリックドメイン画像 — 50万点以上を無料ダウンロード | Fine Art Free",
  metaDescription:
    "50万点以上のパブリックドメイン画像を商用利用無料でダウンロード。名画・クラシックアート・ヴィンテージ版画を高解像度で。プリント販売や商品にも。クレジット表記不要・料金なし。",
  eyebrow: "パブリックドメイン · 商用利用",
  h1: "商用利用OKのパブリックドメイン画像・名画",
  subhead:
    "世界の名だたる美術館から、50万点以上のパブリックドメインの絵画・クラシックアート画像・ヴィンテージ版画を収録。すべて高解像度で無料ダウンロードでき、個人利用にも商用利用にもお使いいただけます。クレジット表記不要、ライセンス料なし、アカウント登録も不要。",
  badges: ["パブリックドメイン", "商用利用OK", "クレジット表記不要", "高解像度"],
  searchPlaceholder: "50万点以上の作品を作家名やキーワードで検索",
  searchAria: "作家名やキーワードで作品を検索",
  searchButtonAria: "検索",
  popularLabel: "人気:",
  popular: ["ゴッホ", "モネ 睡蓮", "植物画", "浮世絵"],
  useCasesH2: "こんな用途に使えます",
  useCases: [
    { title: "プリントオンデマンド商品", text: "Tシャツ・マグカップ・スマホケース — Etsy、Redbubble、Printful ほか。" },
    { title: "アートプリント・額装", text: "キャンバス・ポスター・ギャラリーウォールを好きなサイズで。" },
    { title: "書籍・アルバムのカバー", text: "商業出版、セルフ出版、プレイリスト、ポッドキャスト。" },
    { title: "パッケージ・ブランディング", text: "商品ラベル、文具、由緒あるブランドビジュアルに。" },
    { title: "記事・ブログ", text: "記事、ニュースレター、SNS — 画像予算は不要。" },
    { title: "Web・アプリデザイン", text: "ヒーロー画像、背景、時代を超えたUIのアクセントに。" },
  ],
  downloadH2: "有名絵画を高解像度でダウンロード",
  downloadP:
    "各作品は高解像度（多くは4K以上）でダウンロードでき、美術館の原画からスキャンされています。ゴッホの風景、モネの睡蓮、フェルメールの肖像、レンブラント、ゴヤ、ルノワール、カラヴァッジョ、ターナーを印刷品質で無料ダウンロード。",
  featuredH2: "商用利用無料のおすすめ作品",
  browseAllCta: "50万点以上の作品を見る",
  printH2: "印刷にそのまま使える品質",
  printP:
    "ファイルは実際の印刷に十分な大きさ — キャンバス、額装アート、ポスター、プリントオンデマンド商品に。無料ダウンロードでほとんどの用途をカバー。Fine Art Pro なら大判印刷向けのフルサイズ4K原画も解放。",
  whyH2: "なぜ無料なのか",
  whyP1:
    "著作権が消滅しているためです。作家の没後70年以上が経過し、その作品は世界的にパブリックドメインとなっています。さらにメトロポリタン美術館やアムステルダム国立美術館などは、高解像度スキャンを CC0 のオープンアクセスで公開しています。",
  whyP2:
    "唯一の注意点：画像内の商標や、識別できる存命の人物には別の権利が生じる場合があります — クラシックアートではまれですが、知っておくとよいでしょう。",
  statK1: "4K",
  statK1Sub: "原画ファイル、美術館品質のスキャン",
  statK2: "50万点+",
  statK2Sub: "作品、5世紀にわたる美術",
  statK3: "¥0",
  statK3Sub: "ライセンス料なし・クレジット表記不要 — JPG、POD対応",
  categoriesH2: "人気のカテゴリー",
  categoryLabels: ["植物画", "ヴィンテージポスター", "浮世絵", "風景画", "静物画", "肖像画"],
  closingP:
    "商用利用のためのパブリックドメイン絵画、クライアント案件用のヴィンテージ絵画のダウンロード、商品向けのロイヤリティフリーのクラシックアート — このコレクションの画像はすべて著作権フリーで無料です。カタログは5世紀にわたる美術史を網羅 — 巨匠の絵画から印象派の風景、浮世絵まで — すべて印刷・デジタルデザイン・再販に使える高解像度アートとして利用できます。",
  faqH2: "よくある質問",
  faq: [
    {
      q: "これらの画像で作ったプリントや商品を販売できますか？",
      a: "はい。パブリックドメインの作品は制限なく商用利用でき、Etsyやプリントオンデマンド、ご自身のショップでのプリント・キャンバス・商品の販売も可能です。",
    },
    {
      q: "作家名や美術館名のクレジットは必要ですか？",
      a: "クレジット表記は不要です。作家名を記すのは良い心がけですが、パブリックドメイン作品に法的な表記義務はありません。",
    },
    {
      q: "画像を編集・トリミング・加工できますか？",
      a: "自由に可能です。トリミング、色変更、合成、二次的著作物の制作ができ、作ったものはご自身で利用・販売できます。",
    },
    {
      q: "なぜ無料なのですか？本当に合法ですか？",
      a: "作家の没後70年以上が経過し、著作権は世界的に消滅しています。さらにメトロポリタン美術館やアムステルダム国立美術館などがスキャンを CC0 で公開しています。",
    },
    {
      q: "ダウンロードの解像度は？",
      a: "標準ダウンロードは高解像度で無料です。Fine Art Pro ではフルサイズの原画（多くは4K以上）を大判印刷向けに解放します。",
    },
  ],
  ctaH: "今すぐ無料でダウンロード — ずっと無料",
  ctaSub: "アカウント不要 · Fine Art Pro なら4K原画と無制限ダウンロード",
  ctaBrowse: "無料画像を見る",
  ctaPro: "Fine Art Pro",
  unknownArtist: "作者不詳",
  altConnector: " / ",
  proHeroAlt: "商用利用無料の有名なパブリックドメイン絵画",
};

export const metadata: Metadata = {
  title: { absolute: copy.metaTitle },
  description: copy.metaDescription,
  alternates: buildCommercialUseAlternates("ja"),
  openGraph: { title: copy.metaTitle, description: copy.metaDescription },
};

export default function Page() {
  return <CommercialUseLanding locale="ja" copy={copy} />;
}
