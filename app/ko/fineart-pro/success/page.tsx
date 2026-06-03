import { FineArtProSuccessPage } from "@/components/FineArtProSuccessPage";
import { fineArtProMetadata } from "@/lib/fineart-pro-translations";

export const metadata = fineArtProMetadata("ko");

export default function Page() {
  return <FineArtProSuccessPage locale="ko" />;
}
