import { notFound } from "next/navigation";
import { Container, EmptyState } from "@/components/ui";
import { getSettings } from "@/lib/queries";

// Simple CMS pages whose text is edited in Admin › Website CMS.
const PAGES: Record<string, { key: string; title: string }> = {
  faq: { key: "page_faq", title: "Frequently Asked Questions" },
  news: { key: "page_blog", title: "News & Stories" },
};

export async function generateMetadata({ params }: { params: Promise<{ cms: string }> }) {
  const { cms } = await params;
  return { title: PAGES[cms]?.title ?? "Not found" };
}

export default async function CmsPage({ params }: { params: Promise<{ cms: string }> }) {
  const { cms } = await params;
  const def = PAGES[cms];
  if (!def) notFound();
  const s = await getSettings();
  const body = s[def.key];
  return (
    <Container className="max-w-3xl py-16">
      <h1 className="font-serif text-4xl text-navy">{def.title}</h1>
      {body ? (
        <div className="prose-story mt-8">{body.split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}</div>
      ) : (
        <div className="mt-8"><EmptyState title="Coming soon" body="This page hasn't been written yet." /></div>
      )}
    </Container>
  );
}
