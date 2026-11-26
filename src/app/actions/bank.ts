"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { notifyAdmins } from "@/lib/audit";
import { savePrivateUpload } from "@/lib/uploads";
import { rateLimit } from "@/lib/rate-limit";
import type { FormState } from "@/lib/form-utils";

export async function submitBankSlip(_: FormState, formData: FormData): Promise<FormState> {
  if (!(await rateLimit("bankslip", 10))) return { ok: false, message: "Too many attempts. Please try later." };
  const reference = String(formData.get("reference") ?? "");
  const bankRef = z.string().trim().min(3, "Enter the bank transaction reference").max(80).safeParse(formData.get("bankRef"));
  if (!bankRef.success) return { ok: false, message: bankRef.error.issues[0].message };

  const d = await db.donation.findUnique({ where: { reference }, include: { bankTransfer: true } });
  if (!d || d.method !== "BANK_TRANSFER" || d.status !== "PENDING") return { ok: false, message: "This donation is not awaiting a bank transfer." };
  if (d.bankTransfer?.status === "VERIFIED") return { ok: false, message: "This transfer is already verified." };

  let slipPath: string | null = d.bankTransfer?.slipPath ?? null;
  const file = formData.get("slip");
  if (file instanceof File && file.size > 0) {
    const up = await savePrivateUpload(file, "bank-slips");
    if (!up.ok) return { ok: false, message: up.error };
    slipPath = up.path;
  }

  await db.bankTransfer.upsert({
    where: { donationId: d.id },
    create: { donationId: d.id, bankRef: bankRef.data, slipPath },
    update: { bankRef: bankRef.data, slipPath, status: "PENDING" },
  });
  await notifyAdmins("Bank transfer awaiting verification", `${d.reference}: ref ${bankRef.data}`);
  revalidatePath(`/donate/bank/${reference}`);
  return { ok: true, message: "Thank you. Our finance team will verify your transfer, usually within 2 working days. You'll get an email receipt once it's confirmed." };
}
