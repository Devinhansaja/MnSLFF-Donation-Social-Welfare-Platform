import type { Metadata } from "next";
import { ProjectBrowser } from "@/components/project-browser";
import { PageHero } from "@/components/ui";

export const metadata: Metadata = { title: "Urgent Projects", description: "Verified projects that need funding now." };

export default async function UrgentPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  return (
    <>
      <PageHero eyebrow="Urgent Projects" title="Help is needed now" intro="These verified projects have close deadlines or critical needs. Your gift today makes the biggest difference." image="/images/photos/20-slk-lg.jpg" />
      <ProjectBrowser params={params} preset="urgent" basePath="/urgent" />
    </>
  );
}
