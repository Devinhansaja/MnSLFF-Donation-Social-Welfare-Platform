import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/queries";
import { type SP } from "@/lib/admin-utils";
import { PageHeader } from "@/components/admin/parts";
import { SettingsForm } from "@/components/admin/settings-form";
import { cn } from "@/lib/format";

const PAGES: [string, string, string][] = [
  ["about", "About Us", "/about"],
  ["faq", "FAQ", "/about#faq"],
  ["blog", "Blog / news", "/impact"],
  ["privacy", "Privacy Policy", "/legal/privacy"],
  ["terms", "Terms & Conditions", "/legal/terms"],
  ["donation-policy", "Donation Policy", "/legal/donation-policy"],
  ["refund-policy", "Refund Policy", "/legal/refund-policy"],
];

export default async function CmsPages({ searchParams }: { searchParams: SP }) {
  await requireStaff("content.edit");
  const sp = await searchParams;
  const page = PAGES.find((p) => p[0] === sp.page) ?? PAGES[0];
  const s = await getSettings();
  return (
    <div className="max-w-4xl">
      <PageHeader title={`Page content: ${page[1]}`} intro="Plain text with blank lines between paragraphs. Lines starting with “## ” become headings; for the FAQ use “Q: …” and “A: …” lines. Leave empty to show the built-in default text." />
      <nav className="mb-4 flex flex-wrap gap-2 text-sm">
        {PAGES.map(([k, l]) => (
          <Link key={k} href={`/admin/cms/pages?page=${k}`} className={cn("rounded-full border px-3 py-1", k === page[0] ? "border-forest bg-forest text-white" : "border-line hover:border-forest dark:border-[#24384a]")}>{l}</Link>
        ))}
      </nav>
      <SettingsForm back={`/admin/cms/pages?page=${page[0]}`} values={s} fields={[{ key: `page_${page[0]}`, label: `${page[1]} content (public URL ${page[2]})`, type: "textarea", rows: 22 }]} />
    </div>
  );
}
