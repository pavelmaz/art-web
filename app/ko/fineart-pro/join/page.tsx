import { FineArtProJoinPage } from "@/components/FineArtProJoinPage";
import { fineArtProJoinMetadata } from "@/lib/fineart-pro-translations";

type SearchParams = Promise<{ plan?: string; error?: string; art?: string }>;

export const metadata = fineArtProJoinMetadata("ko");

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return <FineArtProJoinPage locale="ko" searchParams={searchParams} />;
}
