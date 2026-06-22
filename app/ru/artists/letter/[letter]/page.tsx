import type { Metadata } from "next";

import {
  ArtistLetterIndex,
  artistLetterMetadata,
  type ArtistLetterRouteProps,
} from "@/components/ArtistLetterIndex";

export const revalidate = 86400;

export function generateMetadata(props: ArtistLetterRouteProps): Promise<Metadata> {
  return artistLetterMetadata("ru", props);
}

export default function Page(props: ArtistLetterRouteProps) {
  return <ArtistLetterIndex locale="ru" {...props} />;
}
