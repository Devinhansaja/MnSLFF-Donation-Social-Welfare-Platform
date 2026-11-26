import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";
import { Container } from "@/components/ui";

export const metadata = { title: "Donor Login" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <Container className="grid max-w-5xl items-center gap-12 py-16 md:grid-cols-2">
      <div className="hidden md:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/photos/11-slk-lg.jpg" alt="" className="aspect-[4/5] w-full rounded-[2rem] object-cover" />
      </div>
      <div>
        <h1 className="font-serif text-4xl text-navy">Welcome back</h1>
        <p className="mt-2 text-muted">Sign in to see your donations, receipts and project updates. Staff use the same sign-in.</p>
        <div className="mt-8 rounded-[var(--radius-card)] border border-line bg-white p-6">
          <LoginForm next={next} />
        </div>
        <p className="mt-5 text-sm text-muted">New here? <Link href="/register" className="font-semibold text-forest hover:underline">Create a donor account</Link></p>
        <p className="mt-2 text-xs text-muted">Development demo accounts are listed in the project README.</p>
      </div>
    </Container>
  );
}
