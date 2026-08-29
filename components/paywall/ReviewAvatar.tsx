import Image from "next/image";

/** Same avatar treatment as the real Pro page: a supplied reviewer photo when we
 *  have one, otherwise a coloured initial (also the graceful fallback). Kept
 *  self-contained so the paywall preview pages don't depend on the landing
 *  component's internals. */
const AVATAR_COLORS = ["#4285F4", "#DB4437", "#0F9D58", "#F4B400", "#7E57C2", "#00897B"];

const REVIEW_PHOTOS: Record<string, string> = {
  "Yuki Tanaka": "/images/reviews/yuki-tanaka.jpg",
  "Sophie Martin": "/images/reviews/sophie-martin.jpg",
  "Chen Wei": "/images/reviews/chen-wei.jpg",
  "Marta López": "/images/reviews/marta-lopez.jpg",
  "David Reynolds": "/images/reviews/david-reynolds.jpg",
  "Liam O'Connor": "/images/reviews/liam-oconnor.jpg",
};

export function ReviewAvatar({ name, colorIndex, px }: { name: string; colorIndex: number; px: 28 | 40 }) {
  const photo = REVIEW_PHOTOS[name];
  const box = px === 28 ? "h-7 w-7" : "h-10 w-10";
  if (photo) {
    return <Image src={photo} alt={name} width={px} height={px} className={`${box} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <span
      className={`flex ${box} shrink-0 items-center justify-center rounded-full ${px === 28 ? "text-xs" : "text-sm"} font-semibold text-white`}
      style={{ backgroundColor: AVATAR_COLORS[colorIndex % AVATAR_COLORS.length] }}
      aria-hidden
    >
      {name.charAt(0)}
    </span>
  );
}
