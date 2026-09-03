import type { Metadata } from "next";

import { CommercialUseLanding } from "@/components/CommercialUseLanding";
import { buildCommercialUseAlternates, type CommercialUseCopy } from "@/lib/commercial-use-landing";

export const revalidate = 86400;

const copy: CommercialUseCopy = {
  metaTitle: "상업적 이용 무료 퍼블릭 도메인 이미지 — 50만+ 무료 다운로드 | Fine Art Free",
  metaDescription:
    "50만 점 이상의 퍼블릭 도메인 이미지를 상업적 이용까지 무료로 다운로드하세요. 명화·클래식 아트·빈티지 판화를 고해상도로. 프린트 판매와 상품 제작에도. 저작자 표시 불필요, 요금 없음.",
  eyebrow: "퍼블릭 도메인 · 상업적 이용",
  h1: "상업적 이용 무료 퍼블릭 도메인 이미지",
  subhead:
    "세계 유수의 미술관에서 가져온 50만 점 이상의 퍼블릭 도메인 회화, 클래식 아트 이미지, 빈티지 판화. 모두 고해상도로 무료 다운로드할 수 있으며, 개인적·상업적 용도로 사용할 수 있습니다. 저작자 표시 불필요, 라이선스 비용 없음, 계정 가입도 필요 없습니다.",
  badges: ["퍼블릭 도메인", "상업적 이용", "저작자 표시 불필요", "고해상도"],
  searchPlaceholder: "50만+ 작품을 작가 또는 키워드로 검색",
  searchAria: "작가 또는 키워드로 작품 검색",
  searchButtonAria: "검색",
  popularLabel: "인기:",
  popular: ["반 고흐", "모네 수련", "식물 판화", "우키요에"],
  useCasesH2: "이것으로 만들 수 있는 것",
  useCases: [
    { title: "주문 제작(POD) 상품", text: "티셔츠, 머그컵, 폰케이스 — Etsy, Redbubble, Printful 등." },
    { title: "아트 프린트·액자", text: "캔버스, 포스터, 갤러리 월을 원하는 크기로 인쇄." },
    { title: "책·앨범 표지", text: "상업 출판, 자가 출판, 플레이리스트, 팟캐스트." },
    { title: "패키지·브랜딩", text: "제품 라벨, 문구, 진짜 유래가 있는 브랜드 이미지." },
    { title: "에디토리얼·블로그", text: "기사, 뉴스레터, SNS — 이미지 예산 불필요." },
    { title: "웹·앱 디자인", text: "히어로 이미지, 배경, 시대를 초월한 UI 포인트." },
  ],
  downloadH2: "유명 회화를 고해상도로 다운로드",
  downloadP:
    "모든 작품은 고해상도(대부분 4K 이상)로 다운로드할 수 있으며, 미술관 원본에서 스캔되었습니다. 반 고흐의 풍경, 모네의 수련, 페르메이르의 초상, 렘브란트, 고야, 르누아르, 카라바조, 터너를 인쇄 품질로 무료 다운로드하세요.",
  featuredH2: "상업적 이용 무료 추천 작품",
  browseAllCta: "50만+ 작품 모두 보기",
  printH2: "인쇄에 바로 쓰는 품질",
  printP:
    "파일은 실제 인쇄에 충분한 크기입니다 — 캔버스, 액자 벽 장식, 포스터, POD 상품. 무료 다운로드로 대부분의 용도를 충족하며, Fine Art Pro는 대형 인쇄용 풀사이즈 4K 원본을 제공합니다.",
  whyH2: "왜 무료인가요",
  whyP1:
    "저작권이 만료되었기 때문입니다. 작가들이 70년도 더 전에 사망하여 그 작품은 전 세계적으로 퍼블릭 도메인입니다. 또한 메트로폴리탄 미술관, 라익스뮤지엄 등은 고해상도 스캔을 CC0 오픈 액세스로 공개합니다.",
  whyP2:
    "알아둘 유일한 주의점: 이미지 안의 상표나 알아볼 수 있는 생존 인물은 별도의 권리가 있을 수 있습니다 — 고전 미술에서는 드물지만 알아두면 좋습니다.",
  statK1: "4K",
  statK1Sub: "원본 파일, 미술관 수준의 스캔",
  statK2: "50만+",
  statK2Sub: "작품, 5세기에 걸친 예술",
  statK3: "₩0",
  statK3Sub: "라이선스 비용 없음, 저작자 표시 불필요 — JPG, POD 준비 완료",
  categoriesH2: "인기 카테고리",
  categoryLabels: ["식물 판화", "빈티지 포스터", "우키요에", "풍경화", "정물화", "초상화"],
  closingP:
    "상업적 이용을 위한 퍼블릭 도메인 회화, 클라이언트 프로젝트용 빈티지 회화 다운로드, 상품용 로열티 프리 클래식 아트 — 이 컬렉션의 모든 이미지는 저작권이 없고 무료입니다. 카탈로그는 5세기의 미술사를 아우릅니다 — 거장의 회화부터 인상주의 풍경, 우키요에까지 — 모두 인쇄, 디지털 디자인, 재판매에 쓸 수 있는 고해상도 아트로 제공됩니다.",
  faqH2: "자주 묻는 질문",
  faq: [
    {
      q: "이 이미지로 만든 프린트나 상품을 판매할 수 있나요?",
      a: "네. 퍼블릭 도메인 작품은 제한 없이 상업적으로 사용할 수 있으며, Etsy, POD 플랫폼, 자신의 스토어에서 프린트·캔버스·상품 판매가 가능합니다.",
    },
    {
      q: "작가나 미술관을 표시해야 하나요?",
      a: "저작자 표시는 필요하지 않습니다. 작가를 밝히는 것은 좋은 태도이지만, 퍼블릭 도메인 작품에는 누구를 표시할 법적 의무가 없습니다.",
    },
    {
      q: "이미지를 편집·자르기·리믹스할 수 있나요?",
      a: "자유롭게 가능합니다. 자르기, 색 변경, 합성, 2차적 저작물 제작이 가능하며, 만든 결과물은 직접 사용·판매할 수 있습니다.",
    },
    {
      q: "왜 무료인가요? 정말 합법인가요?",
      a: "작가들이 70년도 더 전에 사망하여 저작권이 전 세계적으로 만료되었습니다. 또한 메트로폴리탄, 라익스뮤지엄 같은 미술관이 스캔을 CC0 오픈 액세스로 공개합니다.",
    },
    {
      q: "다운로드 해상도는 어떻게 되나요?",
      a: "기본 다운로드는 고해상도이며 무료입니다. Fine Art Pro는 풀사이즈 원본 파일(대부분 4K 이상)을 대형 인쇄용으로 제공합니다.",
    },
  ],
  ctaH: "지금 다운로드 시작 — 영원히 무료",
  ctaSub: "계정 불필요 · Fine Art Pro로 4K 원본과 무제한 다운로드",
  ctaBrowse: "무료 이미지 둘러보기",
  ctaPro: "Fine Art Pro",
  unknownArtist: "작가 미상",
  altConnector: " / ",
  proHeroAlt: "상업적 이용 무료의 유명 퍼블릭 도메인 회화",
};

export const metadata: Metadata = {
  title: { absolute: copy.metaTitle },
  description: copy.metaDescription,
  alternates: buildCommercialUseAlternates("ko"),
  openGraph: { title: copy.metaTitle, description: copy.metaDescription },
};

export default function Page() {
  return <CommercialUseLanding locale="ko" copy={copy} />;
}
