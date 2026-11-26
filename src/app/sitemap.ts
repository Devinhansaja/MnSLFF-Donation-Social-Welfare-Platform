import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const projects = await db.project.findMany({
    where: { isPublic: true, status: { in: ["FUNDRAISING", "FULLY_FUNDED", "IN_PROGRESS", "COMPLETED"] } },
    select: { slug: true, updatedAt: true },
  });
  const pages = ["", "/about", "/projects", "/urgent", "/completed", "/donors", "/impact", "/transparency", "/request-help", "/contact", "/donate"];
  return [
    ...pages.map((p) => ({ url: `${base}${p}`, changeFrequency: "daily" as const, priority: p === "" ? 1 : 0.7 })),
    ...projects.map((p) => ({ url: `${base}/projects/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "daily" as const, priority: 0.9 })),
  ];
}
