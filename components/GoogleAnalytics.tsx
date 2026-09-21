"use client";

import Script from "next/script";

import { AD_CONSENT_KEY } from "@/lib/analytics";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * GA4 (gtag.js), site-wide. Renders nothing until NEXT_PUBLIC_GA_MEASUREMENT_ID
 * is set, so it can ship ahead of the property existing.
 *
 * Consent Mode: everything starts "denied" (cookieless pings only) and is
 * upgraded when the visitor accepts the cookie banner — same localStorage key
 * MicrosoftUet uses, and the returning-visitor upgrade happens in this same
 * inline script so it can never race React. Page views for client-side
 * navigations come from GA4's default enhanced measurement (history changes).
 */
export function GoogleAnalytics() {
  if (!GA_ID) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});try{if(localStorage.getItem('${AD_CONSENT_KEY}')==='granted'){gtag('consent','update',{analytics_storage:'granted',ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted'});}}catch(e){}gtag('js',new Date());gtag('config','${GA_ID}');`}
      </Script>
    </>
  );
}
