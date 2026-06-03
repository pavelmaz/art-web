import { FineArtProSuccessPage } from "@/components/FineArtProSuccessPage";
import { fineArtProMetadata } from "@/lib/fineart-pro-translations";

export const metadata = fineArtProMetadata("es");

export default function Page() {
  return <FineArtProSuccessPage locale="es" />;
}
