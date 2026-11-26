import { BadgeCheck, Eye, HandHeart, Scale } from "lucide-react";
import { ButtonLink, Container, PageHero } from "@/components/ui";
import { getSettings } from "@/lib/queries";

export const metadata = { title: "About Us", description: "The Minnesota Sri Lanka Friendship Foundation connects generous people with verified community projects across Sri Lanka." };

export default async function AboutPage() {
  const s = await getSettings();
  return (
    <>
      <PageHero eyebrow="About Us" title="A friendship that builds" intro={s.description} image="/images/photos/04-slk-lg.jpg" />
      <Container className="grid grid-cols-1 gap-12 py-16 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 className="font-serif text-3xl text-navy">Our story</h2>
          {s.page_about ? (
            <div className="prose-story mt-4">{s.page_about.split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}</div>
          ) : (
            <div className="prose-story mt-4">
              <p>The Minnesota Sri Lanka Friendship Foundation began when Sri Lankan expatriates and friends in Minnesota came together after the 2004 Indian Ocean tsunami to help rebuild homes and community spaces on Sri Lanka&apos;s southern coast.</p>
              <p>That spirit of practical friendship continues today. We connect donors around the world with families, schools and villages whose needs have been checked in person by our team — and we report back on every dollar.</p>
              <p className="text-sm text-muted">(Edit this text in Admin › Website CMS › About Us.)</p>
            </div>
          )}
          <ButtonLink href="/projects" className="mt-6">See current projects</ButtonLink>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/photos/sri-lankan-rebuilding-lg.jpg" alt="Sri Lanka rebuilding project summary" className="w-full rounded-[2rem] object-cover" />
      </Container>
      <section className="bg-white py-16">
        <Container>
          <h2 className="font-serif text-3xl text-navy">What we stand for</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-4">
            {[
              [BadgeCheck, "Verified needs", "Every project is visited in person and checked against local quotations before fundraising starts."],
              [Eye, "Radical transparency", "Live totals, itemised budgets, expense records and final reports are public by default."],
              [HandHeart, "Dignity first", "We share stories only with consent and never publish private details of beneficiaries or children."],
              [Scale, "Accountable finance", "Dual approval for refunds and fund releases, and an append-only ledger of every transaction."],
            ].map(([Icon, t, b], i) => {
              const I = Icon as typeof BadgeCheck;
              return (
                <div key={i} className="rounded-[var(--radius-card)] border border-line bg-ivory p-6">
                  <I className="size-8 text-forest" />
                  <h3 className="mt-4 font-serif text-xl text-navy">{t as string}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{b as string}</p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>
    </>
  );
}
