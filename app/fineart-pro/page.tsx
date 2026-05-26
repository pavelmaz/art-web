import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";

import { FineArtProFaq } from "@/components/FineArtProFaq";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Fine Art Pro",
  description:
    "Get full access to hi-res images. Access over 400,000 paintings, drawings, posters and illustrations at the highest resolution available.",
  openGraph: {
    title: "Fine Art Pro — Hi-res public domain art",
    description:
      "Download images at the highest resolution available. Free from copyright restrictions and ready for your projects.",
  },
};

const FAQ_ITEMS = [
  {
    question: "What do i get with an FineArt Pro subscription?",
    answer: "You get access to the highest resolution image we have of the Artworks.",
  },
  {
    question: "What can i use the images for?",
    answer:
      "All downloadable images are in the public domain so you can use them for whatever you like.",
  },
  {
    question: "Is my subscription recurring?",
    answer:
      "Yes, you will be charged $9.99 every month or $95.88 every year if you have a yearly subscription, till you cancel your subscription. You can cancel at anytime.",
  },
  {
    question: "How do i cancel my subscription?",
    answer:
      "You can cancel your subscription from your profile page. Click on the subscriptions tab in your profile page and click on the cancel button to end your subscription. After cancellation, your subscription will remain active until the end of the period you paid for (monthly or yearly).",
  },
] as const;

const HERO_BULLETS = [
  "Access over 400,000 paintings, drawings, posters and illustrations",
  "Download Images at the Highest Resolution available",
  "Free from copyright restrictions and ready to be used in your projects.",
] as const;

export default function FineArtProPage() {
  return (
    <div className="bg-white">
      <section className="px-3 pb-10 pt-3 md:px-6 md:pb-14 md:pt-3 lg:pb-16">
        <div className="mr-auto flex max-w-7xl flex-col gap-10 lg:flex-row lg:items-start lg:gap-12 xl:gap-16">
          {/* Left: artwork */}
          <div className="-ml-1 w-full shrink-0 lg:max-w-[42%]">
            <div className="overflow-hidden rounded-2xl border border-[#e8e6e1] bg-[#f5f5f5] shadow-sm">
              <Image
                src="/images/fine-art-pro-wanderer.jpg"
                alt="Wanderer above the Sea of Fog by Caspar David Friedrich, circa 1818"
                width={799}
                height={1024}
                className="h-auto w-full object-cover"
                sizes="(max-width: 1024px) 100vw, 40vw"
                priority
              />
            </div>
          </div>

          {/* Right: headline, bullets, pricing */}
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-3xl font-bold leading-tight tracking-tight text-[#1a1a1a] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12]">
              Get Full Access to Hi-Res Images
            </h1>

            <ul className="mt-8 space-y-4 text-[15px] leading-relaxed text-[#1a1a1a] sm:text-base">
              {HERO_BULLETS.map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="mt-0.5 shrink-0 text-[#1a1a1a]" aria-hidden>
                    ✓
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5">
              <div className="flex flex-col rounded-2xl border border-[#d9d9d9] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6b6b6b]">Yearly Plan</p>
                <p className="mt-3 text-2xl font-bold tracking-tight text-[#1a1a1a] sm:text-[1.65rem]">
                  $7.99 USD /mo
                </p>
                <p className="mt-2 text-xs text-[#6b6b6b]">$95.88 Every 12 Months</p>
                <Link
                  href="/fineart-pro/join?plan=yearly"
                  className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-[#F5C278] px-4 py-3 text-sm font-bold text-[#1a1a1a] transition-colors hover:bg-[#e8b560] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a1a1a] focus-visible:ring-offset-2"
                >
                  Get Fine Art Pro
                </Link>
              </div>

              <div className="flex flex-col rounded-2xl border border-[#d9d9d9] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6b6b6b]">Monthly Plan</p>
                <p className="mt-3 text-2xl font-bold tracking-tight text-[#1a1a1a] sm:text-[1.65rem]">
                  $9.99 USD /mo
                </p>
                <p className="mt-2 text-xs text-[#6b6b6b]">$9.99 Every Month</p>
                <Link
                  href="/fineart-pro/join?plan=monthly"
                  className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-[#F5C278] px-4 py-3 text-sm font-bold text-[#1a1a1a] transition-colors hover:bg-[#e8b560] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a1a1a] focus-visible:ring-offset-2"
                >
                  Get Fine Art Pro
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#E3D1B4] px-3 py-14 md:px-6 md:py-20 lg:py-24">
        <div className="mr-auto flex max-w-7xl flex-col gap-12 lg:flex-row lg:items-start lg:gap-14 xl:gap-20">
          <div className="min-w-0 flex-1">
            <h2
              className={`${playfair.className} text-3xl font-bold leading-[1.15] tracking-tight text-black sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]`}
            >
              Fresh Content Every Month
            </h2>
            <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-black sm:text-base">
              Our ever-growing library is constantly updated with the latest public domain discoveries from the
              archives of some of the best museums and libraries in the world.
            </p>
            <FineArtProFaq items={FAQ_ITEMS} />
          </div>

          <div className="relative w-full shrink-0 lg:max-w-[48%] lg:self-stretch">
            <div className="lg:-mt-6 lg:pt-2">
              <Image
                src="/images/fine-art-pro-moonrise-sea.webp"
                alt="Oil painting Moonrise over the Sea by Caspar David Friedrich, showing three figures on rocks by the shore watching sailing ships at twilight"
                width={800}
                height={612}
                className="h-auto w-full rounded-2xl object-contain shadow-sm lg:rounded-3xl"
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
