import { permanentRedirect } from "next/navigation";

type Props = { params: Promise<{ collection: string }> };

export default async function Page({ params }: Props) {
  const { collection } = await params;
  permanentRedirect(`/prints/${collection}`);
}
