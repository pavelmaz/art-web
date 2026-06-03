import { FineArtProLanding } from "@/components/FineArtProLanding";
import { fineArtProMetadata } from "@/lib/fineart-pro-translations";

export const metadata = fineArtProMetadata("ru");

export default function Page() {
  return <FineArtProLanding locale="ru" />;
}
