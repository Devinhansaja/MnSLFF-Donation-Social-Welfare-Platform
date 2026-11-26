import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/queries";
import { listPhotos } from "@/lib/admin-projects";
import { PageHeader } from "@/components/admin/parts";
import { SubmitButton } from "@/components/forms";
import { saveHeroImages } from "@/app/actions/admin/system";
import { cardPad } from "@/components/admin/styles";

export default async function Hero() {
  await requireStaff("content.edit");
  const [s, photos] = await Promise.all([getSettings(), listPhotos()]);
  let current: string[] = [];
  try { current = JSON.parse(s.heroImages || "[]"); } catch { current = []; }
  return (
    <div>
      <PageHeader title="Hero banners" intro="Choose the photos for the homepage slideshow. Use dignified, consented photographs. Order follows the photo list." />
      <form action={saveHeroImages} className={cardPad}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {photos.map((p) => (
            <label key={p} className="relative block cursor-pointer overflow-hidden rounded-xl has-[:checked]:ring-3 has-[:checked]:ring-forest">
              <input type="checkbox" name="images" value={p} defaultChecked={current.includes(p)} className="absolute left-2 top-2 size-5 accent-forest" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt={p.split("/").pop()} className="aspect-[4/3] w-full object-cover" />
            </label>
          ))}
        </div>
        <div className="mt-5"><SubmitButton>Save slideshow</SubmitButton></div>
      </form>
    </div>
  );
}
