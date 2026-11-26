import { Mail, MapPin, Phone } from "lucide-react";
import { Container, PageHero } from "@/components/ui";
import { ContactForm } from "@/components/contact-form";
import { getSettings } from "@/lib/queries";

export const metadata = { title: "Contact Us" };

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const [s, { subject }] = await Promise.all([getSettings(), searchParams]);
  return (
    <>
      <PageHero eyebrow="Contact Us" title="We'd love to hear from you" intro="Questions about a project, corporate partnerships, volunteering or your donation — our team replies within two working days." image="/images/photos/07-slk-lg.jpg" />
      <Container className="grid grid-cols-1 gap-10 py-14 lg:grid-cols-12">
        <aside className="space-y-4 lg:col-span-4">
          {[[MapPin, "Address", s.address], [Mail, "Email", s.email], [Phone, "Phone", s.phone]].map(([Icon, l, v]) => {
            const I = Icon as typeof Mail;
            return (
              <div key={l as string} className="flex gap-4 rounded-[var(--radius-card)] border border-line bg-white p-5">
                <I className="size-6 shrink-0 text-forest" />
                <div><p className="text-xs text-muted">{l as string}</p><p className="font-medium text-navy">{v as string}</p></div>
              </div>
            );
          })}
        </aside>
        <div className="lg:col-span-8"><ContactForm defaultSubject={subject} /></div>
      </Container>
    </>
  );
}
