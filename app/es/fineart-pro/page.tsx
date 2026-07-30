import { FineArtProLanding } from "@/components/FineArtProLanding";
import { fineArtProMetadata } from "@/lib/fineart-pro-translations";

export const metadata = fineArtProMetadata("es");

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ art?: string }>;
}) {
  const { art } = await searchParams;
  return <FineArtProLanding locale="es" leadArtSlug={art ?? null} />;
}
