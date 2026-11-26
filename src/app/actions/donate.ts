"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { coverFeeAmount, validateItemSponsorship } from "@/lib/finance";
import { ADAPTERS } from "@/lib/payments";
import { randomRef } from "@/lib/format";
import { rateLimit } from "@/lib/rate-limit";
import { getSettings } from "@/lib/queries";
import { echoValues, type FormState } from "@/lib/form-utils";

const schema = z.object({
  idempotencyKey: z.string().uuid(),
  projectSlug: z.string().optional().default(""),
  itemId: z.string().optional().default(""),
  itemQty: z.coerce.number().int().optional(),
  amount: z.coerce.number().min(1, "Minimum donation is $1").max(100000, "For gifts over $100,000 please contact us"),
  frequency: z.enum(["ONE_TIME", "MONTHLY"]),
  coverFee: z.string().optional(),
  method: z.string().min(1, "Choose a payment method"),
  fullName: z.string().trim().min(2, "Please enter your full name").max(120),
  companyName: z.string().trim().max(160).optional().default(""),
  email: z.email("Please enter a valid email"),
  phone: z.string().trim().max(40).optional().default(""),
  country: z.string().length(2, "Please choose your country"),
  donorType: z.enum(["INDIVIDUAL", "CORPORATE", "ORGANIZATION"]),
  message: z.string().trim().max(500).optional().default(""),
  anonymous: z.string().optional(),
  showName: z.string().optional(),
  updates: z.string().optional(),
  terms: z.literal("on", { message: "Please accept the terms and privacy policy" }),
  kind: z.enum(["GENERAL", "PROJECT", "ITEM", "FAMILY", "STUDENT", "CORPORATE"]).optional(),
});

export async function createDonation(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please check the highlighted fields.", errors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])), values: echoValues(formData) };
  }
  const v = parsed.data;

  // Double-submit protection: the same form submission always maps to one donation.
  const existing = await db.donation.findUnique({ where: { idempotencyKey: v.idempotencyKey } });
  if (existing) redirect(nextUrlFor(existing.method, existing.reference));

  if (!(await rateLimit("donate", 20))) return { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };

  const gateway = await db.paymentGateway.findUnique({ where: { code: v.method } });
  if (!gateway?.enabled || v.method === "MANUAL") return { ok: false, message: "This payment method is not available.", errors: { method: "Not available" } };
  const adapter = ADAPTERS[v.method];
  if (v.method !== "BANK_TRANSFER" && (!adapter || !adapter.isConfigured())) {
    return { ok: false, message: "This payment method is not configured yet. Please choose another.", errors: { method: "Not configured" } };
  }

  let amountCents = Math.round(v.amount * 100);
  let projectId: string | null = null;
  let budgetItemId: string | null = null;
  let itemQuantity: number | null = null;
  let kind = v.kind ?? "GENERAL";

  if (v.projectSlug) {
    const project = await db.project.findUnique({ where: { slug: v.projectSlug } });
    const scheduled = project?.publishedAt && project.publishedAt > new Date();
    if (!project || !project.isPublic || scheduled || !["FUNDRAISING", "FULLY_FUNDED", "IN_PROGRESS"].includes(project.status)) {
      return { ok: false, message: "This project is not accepting donations right now." };
    }
    projectId = project.id;
    if (kind === "GENERAL") kind = v.donorType === "CORPORATE" ? "CORPORATE" : "PROJECT";

    if (v.itemId) {
      const item = await db.budgetItem.findFirst({ where: { id: v.itemId, projectId: project.id } });
      if (!item) return { ok: false, message: "That item could not be found." };
      const check = validateItemSponsorship(item, v.itemQty ?? 0);
      if (!check.ok) return { ok: false, message: check.error, errors: { itemQty: check.error } };
      amountCents = check.amountCents; // server decides the price, never the browser
      budgetItemId = item.id;
      itemQuantity = v.itemQty ?? null;
      kind = "ITEM";
    }
  }

  const settings = await getSettings();
  const covered = v.coverFee === "on" && v.method !== "BANK_TRANSFER"
    ? coverFeeAmount(amountCents, Number(settings.feePercent ?? 2.9) / 100, Number(settings.feeFixedCents ?? 30))
    : 0;

  // Signed-in donors give under their own donor profile. Guests always get a
  // fresh donor record: an unauthenticated form must never be able to modify,
  // or attach gifts to, someone else's existing profile just by typing their email.
  const user = await currentUser();
  const email = v.email.toLowerCase();
  let donor = user?.donor ?? null;
  if (!donor) {
    donor = await db.donor.create({
      data: {
        userId: user && !user.donor ? user.id : undefined,
        fullName: v.fullName, companyName: v.companyName || null, email, phone: v.phone || null, country: v.country,
        donorType: v.donorType, notifyUpdates: v.updates === "on",
      },
    });
  } else {
    donor = await db.donor.update({
      where: { id: donor.id },
      data: { phone: v.phone || donor.phone, companyName: v.companyName || donor.companyName, country: v.country, donorType: v.donorType, notifyUpdates: v.updates === "on" },
    });
  }

  const reference = randomRef("DN", 8);
  const total = amountCents + covered;
  const donation = await db.donation.create({
    data: {
      reference, idempotencyKey: v.idempotencyKey, donorId: donor.id, projectId, budgetItemId, itemQuantity,
      amountCents, coveredFeeCents: covered, originalCurrency: "USD", originalAmount: total, exchangeRate: 1,
      method: v.method, status: v.method === "BANK_TRANSFER" ? "PENDING" : "INITIATED", frequency: v.frequency, kind,
      anonymous: v.anonymous === "on", showName: v.anonymous !== "on" && v.showName === "on", message: v.message,
      messageApproved: false,
    },
  });

  if (v.method === "BANK_TRANSFER") redirect(`/donate/bank/${donation.reference}`);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const start = await adapter.startCheckout({ reference: donation.reference, totalCents: total, currency: "USD", siteUrl });
  if ("error" in start) {
    await db.donation.update({ where: { id: donation.id }, data: { status: "FAILED" } });
    return { ok: false, message: start.error };
  }
  redirect(start.redirectUrl);
}

function nextUrlFor(method: string, ref: string) {
  if (method === "BANK_TRANSFER") return `/donate/bank/${ref}`;
  if (method === "SANDBOX") return `/checkout/sandbox/${ref}`;
  return `/donate/success/${ref}`;
}
