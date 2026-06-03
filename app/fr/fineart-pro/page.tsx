import { FineArtProLanding } from "@/components/FineArtProLanding";
import { fineArtProMetadata } from "@/lib/fineart-pro-translations";

export const metadata = fineArtProMetadata("fr");

export default function Page() {
  return <FineArtProLanding locale="fr" />;
}
