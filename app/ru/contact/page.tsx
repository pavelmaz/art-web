import { ContactContent } from "@/components/ContactContent";
import { contactMetadata } from "@/lib/contact-translations";

export const metadata = contactMetadata("ru");

export default function ContactPage() {
  return <ContactContent locale="ru" />;
}
