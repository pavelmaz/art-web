"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Microsoft Advertising UET tag (site-wide) + minimal ad-cookie consent banner.
 *
 * Consent Mode: ad_storage starts "denied" and is upgraded to "granted" only
 * when the visitor accepts (choice persisted in localStorage). The upgrade for
 * returning visitors happens inside the SAME inline script as the default so
 * the two pushes can never race React's lifecycle and arrive out of order.
 * With consent denied the tag still measures cookieless; with it granted,
 * Microsoft can attribute ad-click conversions (msclkid cookie).
 */
const UET_TAG_ID = "343261041";
const CONSENT_KEY = "faf-ad-consent";

declare global {
  interface Window {
    /** Plain queue array before bat.js loads, UET instance afterwards. */
    uetq?: unknown[] | { push: (...args: unknown[]) => unknown };
  }
}

const BANNER_COPY: Record<string, { text: string; accept: string; decline: string }> = {
  en: { text: "We use cookies to understand how visitors find us.", accept: "Accept", decline: "No thanks" },
  es: { text: "Usamos cookies para saber cómo nos encuentran los visitantes.", accept: "Aceptar", decline: "No, gracias" },
  pt: { text: "Usamos cookies para saber como os visitantes nos encontram.", accept: "Aceitar", decline: "Não, obrigado" },
  fr: { text: "Nous utilisons des cookies pour savoir comment les visiteurs nous trouvent.", accept: "Accepter", decline: "Non merci" },
  de: { text: "Wir verwenden Cookies, um zu verstehen, wie Besucher uns finden.", accept: "Akzeptieren", decline: "Nein, danke" },
  it: { text: "Usiamo i cookie per capire come i visitatori ci trovano.", accept: "Accetta", decline: "No, grazie" },
  ja: { text: "訪問者がどのように当サイトを見つけたかを知るためにCookieを使用します。", accept: "同意する", decline: "同意しない" },
  ko: { text: "방문자가 저희를 어떻게 찾았는지 파악하기 위해 쿠키를 사용합니다.", accept: "동의", decline: "거부" },
  ru: { text: "Мы используем cookie, чтобы понять, как посетители нас находят.", accept: "Принять", decline: "Нет, спасибо" },
  zh: { text: "我们使用 Cookie 来了解访客如何找到我们。", accept: "接受", decline: "拒绝" },
};

export function MicrosoftUet() {
  const pathname = usePathname() ?? "/";
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored !== "granted" && stored !== "denied") {
        setShowBanner(true);
      }
    } catch {
      // localStorage unavailable (private mode) — leave consent denied, no banner.
    }
  }, []);

  const choose = (state: "granted" | "denied") => {
    try {
      localStorage.setItem(CONSENT_KEY, state);
    } catch {
      // Non-persistable choice still applies for this page view.
    }
    if (state === "granted") {
      window.uetq = window.uetq ?? [];
      window.uetq.push("consent", "update", { ad_storage: "granted" });
    }
    setShowBanner(false);
  };

  const copy = BANNER_COPY[pathname.split("/")[1] ?? ""] ?? BANNER_COPY.en;

  return (
    <>
      <Script id="microsoft-uet" strategy="afterInteractive">
        {`(function(w,d,t,u,o){w[u]=w[u]||[],o.ts=(new Date).getTime();var n=d.createElement(t);n.src="https://bat.bing.net/bat.js?ti="+o.ti+("uetq"!=u?"&q="+u:""),n.async=1,n.onload=n.onreadystatechange=function(){var s=this.readyState;s&&"loaded"!==s&&"complete"!==s||(o.q=w[u],w[u]=new UET(o),w[u].push("pageLoad"),n.onload=n.onreadystatechange=null)};var i=d.getElementsByTagName(t)[0];i.parentNode.insertBefore(n,i)})(window,document,"script","uetq",{ti:"${UET_TAG_ID}",enableAutoSpaTracking:true});window.uetq=window.uetq||[];window.uetq.push('consent','default',{'ad_storage':'denied'});try{if(localStorage.getItem('${CONSENT_KEY}')==='granted'){window.uetq.push('consent','update',{'ad_storage':'granted'});}}catch(e){}`}
      </Script>
      {showBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl border border-[#e0ded7] bg-white p-4 shadow-lg sm:left-auto sm:right-4 sm:max-w-sm">
          <p className="text-sm leading-relaxed text-[#1a1a1a]">{copy.text}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => choose("granted")}
              className="rounded-md bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#333]"
            >
              {copy.accept}
            </button>
            <button
              type="button"
              onClick={() => choose("denied")}
              className="rounded-md border border-[#d4d2ca] px-4 py-2 text-sm text-[#6b6b6b] transition-colors hover:bg-[#f6f4ee]"
            >
              {copy.decline}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
