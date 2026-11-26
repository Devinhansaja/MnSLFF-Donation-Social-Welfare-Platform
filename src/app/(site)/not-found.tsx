import { ButtonLink, Container } from "@/components/ui";

export default function NotFound() {
  return (
    <Container className="max-w-xl py-24 text-center">
      <p className="font-num font-serif text-6xl text-forest">404</p>
      <h1 className="mt-4 font-serif text-3xl text-navy">We couldn&apos;t find that page</h1>
      <p className="mt-2 text-muted">The project may have closed, or the link may be mistyped.</p>
      <div className="mt-8 flex justify-center gap-3">
        <ButtonLink href="/projects">Browse projects</ButtonLink>
        <ButtonLink href="/" variant="outline">Home</ButtonLink>
      </div>
    </Container>
  );
}
