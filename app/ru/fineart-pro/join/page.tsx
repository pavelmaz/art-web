import { FineArtProJoinPage } from "@/components/FineArtProJoinPage";
import { fineArtProJoinMetadata } from "@/lib/fineart-pro-translations";

type SearchParams = Promise<{ plan?: string; error?: string; art?: string }>;

export const metadata = fineArtProJoinMetadata("ru");

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return <FineArtProJoinPage locale="ru" searchParams={searchParams} />;
}
