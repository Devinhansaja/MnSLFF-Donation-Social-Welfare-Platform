import Link from "next/link";
import { ApplyForm } from "@/components/apply-form";
import { Container, PageHero } from "@/components/ui";

export const metadata = { title: "Request Help", description: "Apply for assistance for a family, school or community in Sri Lanka." };

const STEPS = ["Submitted", "Under review", "Verification assigned", "Field verification", "Approved / not approved", "Project created", "Fundraising started"];

export default function RequestHelpPage() {
  return (
    <>
      <PageHero eyebrow="Request Help" title="Tell us about a need" intro="Families, schools and community groups can apply for support. Every application is reviewed and verified in person before any fundraising begins." image="/images/photos/12-slk-lg.jpg" />
      <Container className="grid grid-cols-1 gap-10 py-14 lg:grid-cols-12">
        <aside className="space-y-6 lg:col-span-4">
          <div className="rounded-[var(--radius-card)] border border-line bg-white p-6">
            <h2 className="font-serif text-xl text-navy">What happens next</h2>
            <ol className="mt-4 space-y-3 text-sm">
              {STEPS.map((s, i) => (
                <li key={s} className="flex gap-3"><span className="font-num flex size-6 shrink-0 items-center justify-center rounded-full bg-forest-50 text-xs font-bold text-forest">{i + 1}</span>{s}</li>
              ))}
            </ol>
          </div>
          <div className="rounded-[var(--radius-card)] border border-line bg-white p-6 text-sm">
            <h2 className="font-serif text-xl text-navy">Already applied?</h2>
            <p className="mt-2 text-muted">Check your application status with your reference number.</p>
            <Link href="/request-help/track" className="mt-3 inline-block font-semibold text-forest hover:underline">Track an application →</Link>
          </div>
        </aside>
        <div className="lg:col-span-8"><ApplyForm /></div>
      </Container>
    </>
  );
}
