import { ContactContent } from "@/components/ContactContent";
import { contactMetadata } from "@/lib/contact-translations";

export const metadata = contactMetadata("ko");

export default function ContactPage() {
  return <ContactContent locale="ko" />;
}
