"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { notifyAdmins, sendEmail } from "@/lib/audit";
import { savePrivateUpload } from "@/lib/uploads";
import { rateLimit } from "@/lib/rate-limit";
import { randomRef } from "@/lib/format";
import { echoValues, zodErrors, type FormState } from "@/lib/form-utils";

const schema = z.object({
  applicantName: z.string().trim().min(2, "Please enter the applicant's name").max(120),
  email: z.email("Please enter a valid email"),
  phone: z.string().trim().min(6, "Please enter a phone number").max(40),
  location: z.string().trim().min(2, "Please enter the village/town and district").max(160),
  category: z.enum(["FAMILY", "SCHOOL", "EDUCATION", "MEDICAL", "HOUSING", "EMERGENCY", "OTHER"]),
  description: z.string().trim().min(40, "Please describe the situation in at least a few sentences").max(5000),
  estimated: z.coerce.number().min(0).max(1000000),
  beneficiaries: z.coerce.number().int().min(1, "At least one beneficiary").max(100000),
  recommendation: z.string().trim().max(1000).optional().default(""),
  consent: z.literal("on", { message: "Consent is required to process your application" }),
});

export async function submitApplication(_: FormState, formData: FormData): Promise<FormState & { reference?: string }> {
  if (!(await rateLimit("apply", 5, 60 * 60 * 1000))) return { ok: false, message: "Too many applications from this connection. Please try again later." };
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: zodErrors(parsed.error.issues), values: echoValues(formData) };

  const files = formData.getAll("documents").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 5);
  const stored: string[] = [];
  for (const f of files) {
    const r = await savePrivateUpload(f, "applications");
    if (!r.ok) return { ok: false, message: `${f.name}: ${r.error}`, values: echoValues(formData) };
    stored.push(r.path);
  }

  const v = parsed.data;
  const reference = randomRef("APP", 8);
  await db.application.create({
    data: {
      reference, applicantName: v.applicantName, email: v.email.toLowerCase(), phone: v.phone, location: v.location, category: v.category,
      description: v.description, estimatedCents: Math.round(v.estimated * 100), beneficiaries: v.beneficiaries,
      recommendation: v.recommendation, documents: JSON.stringify(stored), consent: true,
    },
  });
  await notifyAdmins("New assistance application", `${reference} — ${v.category} — ${v.location}`);
  await sendEmail(v.email, `Application received — ${reference}`, `Thank you. Your application reference is ${reference}. Track it at /request-help/track using this reference and your email.`);
  return { ok: true, message: "Application submitted.", reference };
}
