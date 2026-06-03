import { FineArtProLanding } from "@/components/FineArtProLanding";
import { fineArtProMetadata } from "@/lib/fineart-pro-translations";

export const metadata = fineArtProMetadata("es");

export default function Page() {
  return <FineArtProLanding locale="es" />;
}
