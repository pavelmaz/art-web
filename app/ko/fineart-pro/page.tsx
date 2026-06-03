import { FineArtProLanding } from "@/components/FineArtProLanding";
import { fineArtProMetadata } from "@/lib/fineart-pro-translations";

export const metadata = fineArtProMetadata("ko");

export default function Page() {
  return <FineArtProLanding locale="ko" />;
}
