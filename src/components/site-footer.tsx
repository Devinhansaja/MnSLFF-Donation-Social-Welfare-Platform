import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Container } from "./ui";
import { NewsletterForm } from "./newsletter-form";

export function SiteFooter({ settings, categories }: { settings: Record<string, string>; categories: { slug: string; name: string }[] }) {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-forest-deep text-white/80">
      <Container className="grid gap-12 py-16 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/mark-white.png" alt="" className="h-12 w-auto" />
            <div className="leading-tight text-white">
              <p className="font-serif text-lg">Minnesota Sri Lanka</p>
              <p className="text-sm text-white/70">Friendship Foundation</p>
            </div>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed">{settings.description}</p>
          <ul className="mt-6 space-y-2 text-sm">
            <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />{settings.address}</li>
            <li className="flex gap-2"><Mail className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden /><a href={`mailto:${settings.email}`} className="hover:text-white">{settings.email}</a></li>
            <li className="flex gap-2"><Phone className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />{settings.phone}</li>
          </ul>
          <div className="mt-5 flex gap-3 text-xs">
            {[["Facebook", settings.social_facebook], ["Instagram", settings.social_instagram], ["YouTube", settings.social_youtube], ["LinkedIn", settings.social_linkedin]]
              .filter(([, u]) => u)
              .map(([name, url]) => (
                <a key={name} href={url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/20 px-3 py-1.5 hover:border-gold hover:text-gold">
                  {name}
                </a>
              ))}
          </div>
        </div>

        <FooterCol title="Quick links" className="lg:col-span-2" links={[
          ["/about", "About Us"], ["/projects", "Our Projects"], ["/impact", "Our Impact"], ["/donors", "Our Donors"],
          ["/transparency", "Financial Transparency"], ["/request-help", "Request Help"], ["/news", "News & Stories"], ["/faq", "FAQ"],
          ["/contact", "Contact Us"], ["/login", "Donor Login"],
        ]} />
        <FooterCol title="Categories" className="lg:col-span-2" links={categories.slice(0, 8).map((c) => [`/projects?category=${c.slug}`, c.name])} />
        <div className="lg:col-span-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gold">Stay close to the impact</h2>
          <p className="mt-3 text-sm">Monthly project updates and completion reports. No spam, unsubscribe anytime.</p>
          <NewsletterForm />
          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-gold">Policies</h2>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {[["/legal/privacy", "Privacy Policy"], ["/legal/terms", "Terms & Conditions"], ["/legal/donation-policy", "Donation Policy"], ["/legal/refund-policy", "Refund Policy"], ["/transparency#reports", "Financial Reports"]].map(([h, l]) => (
              <li key={h}><Link href={h} className="hover:text-white">{l}</Link></li>
            ))}
          </ul>
        </div>
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-4 py-6 text-xs text-white/60 md:flex-row md:items-center md:justify-between">
          <p>© {year} {settings.orgName}. {settings.registration}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span>We accept:</span>
            {["Visa", "Mastercard", "Amex", "PayPal*", "Bank transfer"].map((m) => (
              <span key={m} className="rounded border border-white/15 px-2 py-0.5 font-semibold text-white/80">{m}</span>
            ))}
            <span className="text-white/40">*when activated</span>
          </div>
        </Container>
      </div>
    </footer>
  );
}

function FooterCol({ title, links, className }: { title: string; links: string[][]; className?: string }) {
  return (
    <div className={className}>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gold">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map(([href, label]) => (
          <li key={href}><Link href={href} className="hover:text-white">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
