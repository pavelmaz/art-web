"use client";

import type { ProductCategory } from "@/lib/prodigi";

type PrintProductGalleryProps = {
  imageUrl: string;
  title: string;
  category: ProductCategory;
};

/** The artwork itself, styled to read as the chosen category — canvas
 *  shadow / print mat / card fold, matching the original modal's treatment. */
function StyledArtwork({ category, imageUrl }: { category: ProductCategory; imageUrl: string }) {
  const tile: React.CSSProperties = imageUrl
    ? { backgroundImage: `url("${imageUrl}")`, backgroundSize: "cover", backgroundPosition: "center" }
    : {};
  const base = "aspect-[4/5] w-full max-w-xs";

  if (category === "wall-art") {
    return <div className={`${base} rounded-[2px] shadow-[0_10px_24px_-6px_rgba(0,0,0,0.5)]`} style={tile} aria-hidden />;
  }
  if (category === "cards-stationery") {
    return (
      <div className={`${base} relative rounded-sm bg-white p-2 shadow-[0_10px_20px_-6px_rgba(0,0,0,0.35)]`}>
        <div style={tile} className="h-full w-full rounded-[1px]" aria-hidden />
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-black/10" aria-hidden />
      </div>
    );
  }
  // prints-posters: white mat border
  return (
    <div className={`${base} rounded-[1px] bg-white p-2.5 shadow-[0_10px_20px_-6px_rgba(0,0,0,0.35)]`}>
      <div style={tile} className="h-full w-full" aria-hidden />
    </div>
  );
}

export function PrintProductGallery({ imageUrl, category }: PrintProductGalleryProps) {
  return (
    <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-[#f1efea] p-6">
      <StyledArtwork category={category} imageUrl={imageUrl} />
    </div>
  );
}
