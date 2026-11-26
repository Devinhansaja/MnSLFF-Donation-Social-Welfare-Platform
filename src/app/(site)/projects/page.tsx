import type { Metadata } from "next";
import { ProjectBrowser } from "@/components/project-browser";
import { PageHero } from "@/components/ui";

export const metadata: Metadata = {
  title: "Our Projects",
  description: "Browse verified humanitarian projects across Sri Lanka. Filter by cause, district and funding status.",
};

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  return (
    <>
      <PageHero
        eyebrow="Our Projects"
        title="Verified projects, real needs"
        intro="Every project has been visited and verified by our field team. Track each dollar from donation to completion."
        image="/images/photos/13-slk-lg.jpg"
      />
      <ProjectBrowser params={params} basePath="/projects" />
    </>
  );
}
