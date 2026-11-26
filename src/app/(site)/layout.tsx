import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getT } from "@/lib/i18n";
import { getSettings } from "@/lib/queries";
import { getSession } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [{ t, lang }, settings, session, categories] = await Promise.all([
    getT(),
    getSettings(),
    getSession(),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
  ]);
  const nav = [
    { href: "/", label: t("home") },
    { href: "/about", label: t("about") },
    { href: "/projects", label: t("projects") },
    { href: "/urgent", label: t("urgent") },
    { href: "/completed", label: t("completed") },
    { href: "/donors", label: t("donors") },
    { href: "/impact", label: t("impact") },
    { href: "/transparency", label: t("transparency") },
    { href: "/request-help", label: t("requestHelp") },
    { href: "/contact", label: t("contact") },
  ];
  return (
    <>
      <SiteHeader
        nav={nav}
        lang={lang}
        labels={{ donate: t("donateNow"), login: t("login") }}
        signedIn={session ? { name: session.name, href: isStaff(session.role) ? "/admin" : "/account" } : null}
      />
      <main id="main" className={lang === "si" ? "pt-18 [&_h1]:font-sinhala [&_h2]:font-sinhala" : "pt-18"}>
        {children}
      </main>
      <SiteFooter settings={settings} categories={categories} />
    </>
  );
}
