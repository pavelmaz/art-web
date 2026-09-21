import { PromoBanner } from "@/components/PromoBanner";

/** 21 Sep 2026 — test banner for the "pnHLwbxS" 50%-off-once coupon, scoped to
 *  /blog only (a nested layout wraps just this route, not the whole site). */
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PromoBanner href="/fineart-pro/join?plan=yearly&coupon=pnHLwbxS" />
      {children}
    </>
  );
}
