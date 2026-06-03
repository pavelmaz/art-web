import { FineArtProJoinPage } from "@/components/FineArtProJoinPage";
import { fineArtProJoinMetadata } from "@/lib/fineart-pro-translations";

type SearchParams = Promise<{ plan?: string; error?: string }>;

export const metadata = fineArtProJoinMetadata("fr");

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return <FineArtProJoinPage locale="fr" searchParams={searchParams} />;
}
