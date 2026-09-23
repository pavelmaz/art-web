"use client";

import { useState } from "react";

import { PrintProductGallery } from "@/components/PrintProductGallery";
import { PrintProductPurchasePanel } from "@/components/PrintProductPurchasePanel";
import { PRODUCT_CATEGORIES, type ProductCategory } from "@/lib/prodigi";

export function PrintProductPage({
  artworkSlug,
  title,
  imageUrl,
  orientation,
}: {
  artworkSlug: string;
  title: string;
  imageUrl: string;
  orientation: "portrait" | "landscape";
}) {
  const [category, setCategory] = useState<ProductCategory>("wall-art");
  const [productKey, setProductKey] = useState<string>(PRODUCT_CATEGORIES[0].productKeys[0]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <PrintProductGallery imageUrl={imageUrl} title={title} category={category} orientation={orientation} />
        <PrintProductPurchasePanel
          artworkSlug={artworkSlug}
          title={title}
          category={category}
          productKey={productKey}
          onCategoryChange={setCategory}
          onProductChange={setProductKey}
        />
      </div>
    </div>
  );
}
