import { notFound } from "next/navigation";
import { Container } from "@/components/ui";
import { getSettings } from "@/lib/queries";

const PAGES: Record<string, { title: string; body: string }> = {
  privacy: {
    title: "Privacy Policy",
    body: `We collect only what we need to process donations, issue receipts and keep you informed: your name, email, country and (optionally) phone and company.
We never sell or share your data. Card details are entered on our payment provider's hosted page and never reach our servers.
Your name appears on public donor lists only if you allow it, and you can give anonymously at any time.
Beneficiary information is collected with consent, stored privately, and published only in aggregated, anonymised form. Children's personal details are never published.
You can ask us to access, correct or delete your personal data by contacting us. Financial records are retained as required by law.`,
  },
  terms: {
    title: "Terms & Conditions",
    body: `By using this website you agree to use it lawfully and to provide accurate information when donating or applying for help.
Project information is provided in good faith following field verification. Circumstances can change; we publish updates when they do.
All amounts are in US dollars unless stated otherwise.`,
  },
  "donation-policy": {
    title: "Donation Policy",
    body: `Donations designated to a project are restricted to that project. If a project is overfunded, cancelled or completed under budget, surplus funds are handled under the policy published by the board — typically transferred to the most similar active project, with donors informed.
Item sponsorships are allocated when payment is confirmed. If an item becomes fully funded before your payment is confirmed, your gift supports the same project's remaining needs.
A donation counts toward project totals only after the payment provider confirms it, or after our finance team verifies a bank transfer.`,
  },
  "refund-policy": {
    title: "Refund Policy",
    body: `If you made a mistake when donating, contact us within 30 days and we will refund the donation. Refunds are approved by two members of our finance team.
Payment processing fees charged by providers may not be recoverable. Refunded amounts are removed from public project totals.`,
  },
};

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  return { title: PAGES[page]?.title ?? "Policy" };
}

export default async function LegalPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const def = PAGES[page];
  if (!def) notFound();
  const s = await getSettings();
  const body = s[`page_${page}`] || def.body;
  return (
    <Container className="max-w-3xl py-16">
      <h1 className="font-serif text-4xl text-navy">{def.title}</h1>
      <p className="mt-2 text-xs text-muted">Template text — have it reviewed by a legal adviser before launch. Editable in Admin › Website CMS › Legal Pages.</p>
      <div className="prose-story mt-8">{body.split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}</div>
    </Container>
  );
}
