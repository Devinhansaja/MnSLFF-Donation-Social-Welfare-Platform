import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/queries";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/parts";
import { SettingsForm } from "@/components/admin/settings-form";
import { cardPad, link } from "@/components/admin/styles";

export default async function CmsHome() {
  await requireStaff("view");
  const [s, featured, testimonials, messages] = await Promise.all([
    getSettings(),
    db.project.count({ where: { featured: true } }),
    db.testimonial.count({ where: { approved: true } }),
    db.contactMessage.count(),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Homepage & website content" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["/admin/cms/hero", "Hero banners", "Slideshow images"],
          ["/admin/cms/featured", "Featured projects", `${featured} featured`],
          ["/admin/cms/testimonials", "Testimonials & stories", `${testimonials} published`],
          ["/admin/cms/messages", "Contact messages", `${messages} received`],
          ["/admin/cms/pages?page=about", "About Us", "Page text"],
          ["/admin/cms/pages?page=faq", "FAQ", "Questions & answers"],
          ["/admin/cms/pages?page=privacy", "Legal pages", "Privacy, terms, policies"],
          ["/admin/cms/seo", "SEO settings", "Default titles & descriptions"],
        ].map(([h, t, d]) => (
          <Link key={h} href={h} className={`${cardPad} block hover:border-forest`}>
            <p className="font-semibold">{t}</p><p className="text-sm text-muted">{d}</p>
          </Link>
        ))}
      </div>
      <SettingsForm back="/admin/cms" title="Homepage text" values={s} fields={[
        { key: "tagline", label: "Core message (shown in footer/CTA)", wide: true },
        { key: "home_hero_title", label: "Hero headline override (blank = default translated headline)", wide: true },
        { key: "home_hero_subtitle", label: "Hero subtitle override", type: "textarea", rows: 2 },
        { key: "statFamilies", label: "Families supported override (blank = calculated from projects)", type: "number" },
      ]} />
      <p className="text-xs text-muted">Overrides are stored as settings; the public homepage uses them where it reads these keys. <Link className={link} href="/" target="_blank">Open homepage</Link></p>
    </div>
  );
}
