import { FineArtProLanding } from "@/components/FineArtProLanding";
import { fineArtProMetadata } from "@/lib/fineart-pro-translations";

export const metadata = fineArtProMetadata("ja");

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ art?: string }>;
}) {
  const { art } = await searchParams;
  return <FineArtProLanding locale="ja" leadArtSlug={art ?? null} />;
}
