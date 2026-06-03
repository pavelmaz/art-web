import { FineArtProSuccessPage } from "@/components/FineArtProSuccessPage";
import { fineArtProMetadata } from "@/lib/fineart-pro-translations";

export const metadata = fineArtProMetadata("ru");

export default function Page() {
  return <FineArtProSuccessPage locale="ru" />;
}
