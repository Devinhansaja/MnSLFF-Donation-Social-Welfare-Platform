import type { Metadata } from "next";
import { ProjectBrowser } from "@/components/project-browser";
import { PageHero } from "@/components/ui";

export const metadata: Metadata = { title: "Completed Projects", description: "Projects completed with donor support, with full impact reports." };

export default async function CompletedPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  return (
    <>
      <PageHero eyebrow="Completed Projects" title="Finished, reported, accountable" intro="Each completed project publishes a final report: funds received, money spent, before-and-after photos and the people it reached." image="/images/photos/04-slk-lg.jpg" />
      <ProjectBrowser params={params} preset="completed" basePath="/completed" />
    </>
  );
}
