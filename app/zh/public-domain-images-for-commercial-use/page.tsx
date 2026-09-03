import type { Metadata } from "next";

import { CommercialUseLanding } from "@/components/CommercialUseLanding";
import { buildCommercialUseAlternates, type CommercialUseCopy } from "@/lib/commercial-use-landing";

export const revalidate = 86400;

const copy: CommercialUseCopy = {
  metaTitle: "可商用的公共领域图片 — 50万+免费高清下载 | Fine Art Free",
  metaDescription:
    "免费下载50万+公共领域图片，可商用：名画、古典艺术与复古版画高清大图。可用于售卖印刷品与商品。无需署名，零费用，无版权限制。",
  eyebrow: "公共领域 · 可商用",
  h1: "可免费商用的公共领域高清图片",
  subhead:
    "汇集全球顶级博物馆的50万+公共领域画作、古典艺术图片与复古版画——每个文件均可免费下载高清大图，可用于个人与商业用途。无需署名，无授权费用，也无需注册账号。",
  badges: ["公共领域", "可商用", "无需署名", "高清大图"],
  searchPlaceholder: "在50万+作品中按艺术家或关键词搜索",
  searchAria: "按艺术家或关键词搜索作品",
  searchButtonAria: "搜索",
  popularLabel: "热门：",
  popular: ["梵高", "莫奈 睡莲", "植物版画", "浮世绘"],
  useCasesH2: "你可以用它们做什么",
  useCases: [
    { title: "按需印刷（POD）商品", text: "T恤、马克杯、手机壳——Etsy、Redbubble、Printful 等。" },
    { title: "艺术微喷与装裱画", text: "画布、海报与画廊墙，任意尺寸印刷。" },
    { title: "书籍与专辑封面", text: "商业出版、自出版、歌单与播客。" },
    { title: "包装与品牌", text: "产品标签、文具与有真实出处的品牌视觉。" },
    { title: "编辑与博客", text: "文章、通讯与社交媒体——无需图片预算。" },
    { title: "网页与应用设计", text: "主视觉图、背景与经久不衰的界面点缀。" },
  ],
  downloadH2: "高清下载世界名画",
  downloadP:
    "每幅作品均提供高清下载，多数为4K或更高，扫描自博物馆原作。免费下载梵高的风景、莫奈的睡莲、维米尔的肖像，以及伦勃朗、戈雅、雷诺阿、卡拉瓦乔与透纳的印刷级图片。",
  featuredH2: "精选可商用免费作品",
  browseAllCta: "浏览全部50万+作品",
  printH2: "可直接印刷的画质",
  printP:
    "文件足够大，可用于真实印刷——画布、装裱墙面艺术、海报与按需印刷商品。免费下载即可满足绝大多数用途；Fine Art Pro 解锁全尺寸4K原图，适合大幅面印刷。",
  whyH2: "为什么这些图片是免费的",
  whyP1:
    "因为版权已过期：这些艺术家已逝世70年以上，其作品在全球范围内进入公共领域。此外，大都会艺术博物馆、荷兰国立博物馆等还以 CC0 开放授权发布高清扫描件。",
  whyP2:
    "唯一需要注意的一点：图片中的商标或可辨认的在世人物可能另有权利——在古典艺术中很少见，但了解一下有好处。",
  statK1: "4K",
  statK1Sub: "原始文件，博物馆级扫描",
  statK2: "50万+",
  statK2Sub: "作品，横跨五个世纪的艺术",
  statK3: "¥0",
  statK3Sub: "无授权费、无需署名——JPG，适配 POD",
  categoriesH2: "热门分类",
  categoryLabels: ["植物版画", "复古海报", "浮世绘", "风景画", "静物画", "肖像画"],
  closingP:
    "无论你需要用于商业用途的公共领域画作、为客户项目下载的复古画作，还是用于商品的免版税古典艺术——本合集中的每一张图片都无版权且免费。目录涵盖五个世纪的艺术史——从古典大师的画作到印象派风景，再到日本浮世绘——全部以高清艺术图片形式提供，可用于印刷、数字设计与转售。",
  faqH2: "常见问题",
  faq: [
    {
      q: "我可以售卖用这些图片制作的印刷品或商品吗？",
      a: "可以。公共领域作品可不受限制地商用——包括在 Etsy、按需印刷平台或你自己的店铺售卖印刷品、画布与商品。",
    },
    {
      q: "需要标注艺术家或博物馆吗？",
      a: "无需署名。标注艺术家是一种善意之举，但公共领域作品在法律上并不要求署名任何人。",
    },
    {
      q: "我可以编辑、裁剪或二次创作这些图片吗？",
      a: "完全可以。你可以裁剪、调色、拼合并创作衍生作品——你的衍生作品归你所有，可自由使用与售卖。",
    },
    {
      q: "为什么这些图片是免费的？真的合法吗？",
      a: "这些艺术家已逝世70年以上，版权已在全球过期。此外，大都会、荷兰国立博物馆等博物馆以 CC0 开放授权发布其扫描件。",
    },
    {
      q: "下载的分辨率是多少？",
      a: "标准下载为高清且免费。Fine Art Pro 解锁全尺寸原始文件（多数为4K或更高），适合大幅面印刷。",
    },
  ],
  ctaH: "立即开始下载——永久免费",
  ctaSub: "无需账号 · 使用 Fine Art Pro 畅享4K原图与无限下载",
  ctaBrowse: "浏览免费图片",
  ctaPro: "Fine Art Pro",
  unknownArtist: "佚名",
  altConnector: " / ",
  proHeroAlt: "可免费商用的著名公共领域画作",
};

export const metadata: Metadata = {
  title: { absolute: copy.metaTitle },
  description: copy.metaDescription,
  alternates: buildCommercialUseAlternates("zh"),
  openGraph: { title: copy.metaTitle, description: copy.metaDescription },
};

export default function Page() {
  return <CommercialUseLanding locale="zh" copy={copy} />;
}
