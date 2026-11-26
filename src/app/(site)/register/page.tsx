import Link from "next/link";
import { RegisterForm } from "@/components/auth-forms";
import { Container } from "@/components/ui";

export const metadata = { title: "Create a donor account" };

export default function RegisterPage() {
  return (
    <Container className="max-w-lg py-16">
      <h1 className="font-serif text-4xl text-navy">Create your donor account</h1>
      <p className="mt-2 text-muted">Track every gift, download receipts and annual statements, and follow the projects you support.</p>
      <div className="mt-8 rounded-[var(--radius-card)] border border-line bg-white p-6">
        <RegisterForm />
      </div>
      <p className="mt-5 text-sm text-muted">Already have an account? <Link href="/login" className="font-semibold text-forest hover:underline">Sign in</Link></p>
    </Container>
  );
}
