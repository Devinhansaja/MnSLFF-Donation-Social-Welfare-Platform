import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { listPhotos } from "@/lib/admin-projects";
import { type SP } from "@/lib/admin-utils";
import { PageHeader, Section } from "@/components/admin/parts";
import { SubmitButton } from "@/components/forms";
import { DemoBadge } from "@/components/ui";
import { deleteTestimonial, saveTestimonial } from "@/app/actions/admin/system";
import { card } from "@/components/admin/styles";

type T = { id?: string; name?: string; role?: string; quote?: string; image?: string | null; consent?: boolean; approved?: boolean };

export default async function Testimonials({ searchParams }: { searchParams: SP }) {
  await requireStaff("content.edit");
  const sp = await searchParams;
  const [rows, photos] = await Promise.all([
    db.testimonial.findMany({ where: sp.role ? { role: sp.role } : {}, orderBy: { id: "asc" } }),
    listPhotos(),
  ]);
  const form = (t: T) => (
    <form action={saveTestimonial} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {t.id && <input type="hidden" name="id" value={t.id} />}
      <input name="name" defaultValue={t.name} required placeholder="Name (or first name only)" className="field h-10 !py-1 text-sm" aria-label="Name" />
      <select name="role" defaultValue={t.role ?? sp.role ?? "BENEFICIARY"} className="field h-10 !py-1 text-sm" aria-label="Role">
        <option value="BENEFICIARY">Beneficiary (success story)</option><option value="DONOR">Donor</option><option value="COORDINATOR">Project coordinator</option><option value="VOLUNTEER">Volunteer</option>
      </select>
      <textarea name="quote" defaultValue={t.quote} required rows={3} placeholder="Quote / story" className="field text-sm sm:col-span-2" aria-label="Quote" />
      <select name="image" defaultValue={t.image ?? ""} className="field h-10 !py-1 text-sm" aria-label="Photo">
        <option value="">No photo</option>{photos.map((p) => <option key={p} value={p}>{p.split("/").pop()}</option>)}
      </select>
      <div className="flex items-center gap-4 text-sm">
        <label className="flex items-center gap-1.5"><input type="checkbox" name="consent" defaultChecked={t.consent} className="size-4 accent-forest" /> Consent recorded</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" name="approved" defaultChecked={t.approved} className="size-4 accent-forest" /> Published</label>
      </div>
      <div className="sm:col-span-2"><SubmitButton size="sm">{t.id ? "Save" : "Add testimonial"}</SubmitButton></div>
    </form>
  );
  return (
    <div className="space-y-6">
      <PageHeader title={sp.role === "BENEFICIARY" ? "Success stories" : "Testimonials"} intro="Only testimonials with recorded consent can be published. Never identify children by full name." />
      <Section title="Add new">{form({})}</Section>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {rows.map((t) => (
          <div key={t.id} className={`${card} p-4`}>
            <div className="mb-2 flex items-center gap-2">{t.isDemo && <DemoBadge />}<span className="text-xs text-muted">{t.approved ? "Published" : "Hidden"}</span></div>
            {form(t)}
            <form action={deleteTestimonial} className="mt-2"><input type="hidden" name="id" value={t.id} /><SubmitButton size="sm" variant="quiet" confirm="Delete this testimonial?">Delete</SubmitButton></form>
          </div>
        ))}
      </div>
    </div>
  );
}
