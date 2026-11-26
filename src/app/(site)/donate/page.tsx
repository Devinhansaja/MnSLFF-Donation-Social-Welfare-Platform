import type { Metadata } from "next";
import { DonateForm } from "@/components/donate-form";
import { Container } from "@/components/ui";
import { db } from "@/lib/db";
import { getProjects, getSettings, publicWhere } from "@/lib/queries";
import { currentUser } from "@/lib/auth";
import { itemRemaining } from "@/lib/finance";

export const metadata: Metadata = { title: "Donate", description: "Make a secure donation in USD to a verified project in Sri Lanka." };

export default async function DonatePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [projects, gateways, settings, user] = await Promise.all([
    getProjects({ AND: [publicWhere(), { status: { in: ["FUNDRAISING", "FULLY_FUNDED", "IN_PROGRESS"] } }] }),
    db.paymentGateway.findMany({ where: { enabled: true, code: { not: "MANUAL" } }, orderBy: { sortOrder: "asc" } }),
    getSettings(),
    currentUser(),
  ]);

  const selected = projects.find((p) => p.slug === sp.project);
  let item = null;
  if (selected && sp.item) {
    const it = await db.budgetItem.findFirst({ where: { id: sp.item, projectId: selected.id, sponsorable: true } });
    if (it && itemRemaining(it) > 0) item = { id: it.id, name: it.name, unitCents: it.unitCents, remaining: itemRemaining(it) };
  }
  const kind = ["FAMILY", "STUDENT", "CORPORATE"].includes(sp.kind ?? "") ? sp.kind! : selected ? "PROJECT" : "GENERAL";

  return (
    <div className="bg-ivory">
      <Container className="py-12 sm:py-16">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-forest">Secure donation · USD</p>
          <h1 className="font-serif text-4xl text-navy sm:text-5xl">{selected ? "Support this project" : "Make a donation"}</h1>
          <p className="mt-3 text-muted">{selected ? selected.title : "Give to a specific project, sponsor an item, or let us direct your gift where it is needed most."}</p>
        </div>
        <DonateForm
          projects={projects.filter((p) => p.status === "FUNDRAISING" || p.slug === sp.project).map((p) => ({ slug: p.slug, title: p.title, remainingCents: p.finance.remainingGross }))}
          initialProject={selected?.slug ?? ""}
          item={item}
          gateways={gateways.map((g) => ({ code: g.code, name: g.name, description: g.description, sandbox: g.sandbox }))}
          feePercent={Number(settings.feePercent ?? 2.9)}
          feeFixedCents={Number(settings.feeFixedCents ?? 30)}
          defaults={{ fullName: user?.donor?.fullName ?? user?.name ?? "", email: user?.email ?? "", country: user?.donor?.country ?? "" }}
          initialKind={kind}
        />
      </Container>
    </div>
  );
}
