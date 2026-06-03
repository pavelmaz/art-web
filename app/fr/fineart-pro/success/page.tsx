import { FineArtProSuccessPage } from "@/components/FineArtProSuccessPage";
import { fineArtProMetadata } from "@/lib/fineart-pro-translations";

export const metadata = fineArtProMetadata("fr");

export default function Page() {
  return <FineArtProSuccessPage locale="fr" />;
}
