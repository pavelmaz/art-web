"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * Fine Art Pro hero: slowly crossfades through a handful of masterpieces so the
 * page feels like a living collection rather than one static image. Each image
 * holds HOLD_MS, then dissolves into the next (pure opacity transition — no
 * slider chrome). The first image renders with priority so LCP is unaffected;
 * the rest sit stacked underneath and lazy-load. Rotation is skipped for users
 * with prefers-reduced-motion.
 */
const HOLD_MS = 3000;

const IMAGES = [
  "/images/fine-art-pro-wanderer.jpg",
  "/images/fine-art-pro-girl.jpg",
  "/images/fine-art-pro-monk.webp",
  "/images/fine-art-pro-pearl.webp",
];

type RotatingProHeroProps = {
  alt: string;
};

export function RotatingProHero({ alt }: RotatingProHeroProps) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const id = setInterval(() => setActive((a) => (a + 1) % IMAGES.length), HOLD_MS);
    return () => clearInterval(id);
  }, []);

  return (
    // Fixed portrait box (the original wanderer.jpg ratio) so differently
    // proportioned paintings crossfade without any layout shift.
    <div className="relative aspect-[799/1024] w-full">
      {IMAGES.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt={i === active ? alt : ""}
          fill
          className={`object-cover transition-opacity duration-[900ms] ease-in-out ${
            i === active ? "opacity-100" : "opacity-0"
          }`}
          sizes="(max-width: 1024px) 100vw, 40vw"
          priority={i === 0}
        />
      ))}
    </div>
  );
}
