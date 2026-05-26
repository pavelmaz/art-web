import Link from "next/link";
import type { ReactNode } from "react";

const buttonClassName =
  "inline-flex items-center rounded-md bg-[#1a1a1a] px-5 py-2 text-sm font-medium text-white hover:bg-[#333]";

type SectionCtaLinkProps = {
  href: string;
  children: ReactNode;
};

export function SectionCtaLink({ href, children }: SectionCtaLinkProps) {
  return (
    <div className="mt-8">
      <Link href={href} className={buttonClassName}>
        {children}
      </Link>
    </div>
  );
}
