"use client";

import { track } from "@vercel/analytics";
import Link from "next/link";
import type { ReactNode } from "react";

import type { Locale } from "@/lib/translations";

type PlanCtaLinkProps = {
  href: string;
  plan: "yearly" | "monthly";
  locale: Locale;
  className?: string;
  children: ReactNode;
};

/**
 * Plan button on the Fine Art Pro landing page. The landing page itself is a
 * Server Component, so the click handler lives here: `plan_selected` records
 * which plan was chosen and from which locale, closing the gap between
 * paywall_cta_click (artwork page) and purchase (success page).
 */
export function PlanCtaLink({ href, plan, locale, className, children }: PlanCtaLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => track("plan_selected", { plan, locale })}
    >
      {children}
    </Link>
  );
}
