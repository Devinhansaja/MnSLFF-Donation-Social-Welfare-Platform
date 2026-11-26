import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/queries";
import { PageHeader, Section } from "@/components/admin/parts";
import { SettingsForm } from "@/components/admin/settings-form";
import { link, table, tbody, td, th } from "@/components/admin/styles";

export default async function Seo() {
  await requireStaff("content.edit");
  const [s, projects] = await Promise.all([
    getSettings(),
    db.project.findMany({ where: { isPublic: true }, orderBy: { code: "asc" }, select: { id: true, code: true, slug: true, seoTitle: true, metaDescription: true } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="SEO settings" intro="Site-wide defaults. Each project's SEO title, meta description and URL are set in its wizard (Publishing step)." />
      <SettingsForm back="/admin/cms/seo" values={s} fields={[
        { key: "seo_default_title", label: "Default site title", wide: true },
        { key: "seo_default_description", label: "Default meta description", type: "textarea", rows: 2 },
        { key: "seo_og_image", label: "Default social sharing image path", hint: "e.g. /images/photos/13-slk-lg.jpg" },
      ]} />
      <Section title="Project SEO checklist">
        <table className={table}>
          <thead><tr><th className={th}>Project</th><th className={th}>URL</th><th className={th}>SEO title</th><th className={th}>Meta description</th></tr></thead>
          <tbody className={tbody}>
            {projects.map((p) => (
              <tr key={p.id}>
                <td className={td}><Link className={link} href={`/admin/projects/${p.id}/edit`}>{p.code}</Link></td>
                <td className={`${td} font-mono text-xs`}>/projects/{p.slug}</td>
                <td className={td}>{p.seoTitle ? `${p.seoTitle.length} chars` : <span className="text-urgent">missing</span>}</td>
                <td className={td}>{p.metaDescription ? `${p.metaDescription.length} chars` : <span className="text-urgent">missing</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}
