"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { notifyAdmins } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

import { echoValues, type FormState } from "@/lib/form-utils";

export async function subscribe(_: FormState, formData: FormData): Promise<FormState> {
  const email = z.email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { ok: false, message: "Please enter a valid email address." };
  if (!(await rateLimit("subscribe", 10))) return { ok: false, message: "Too many attempts. Please try again later." };
  await db.subscriber.upsert({ where: { email: email.data }, create: { email: email.data }, update: {} });
  return { ok: true, message: "Thank you — you're subscribed." };
}

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.email("Please enter a valid email"),
  subject: z.string().trim().min(2, "Please add a subject").max(160),
  message: z.string().trim().min(10, "Please write at least a few words").max(5000),
});

export async function sendContact(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", errors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])), values: echoValues(formData) };
  }
  if (!(await rateLimit("contact", 5))) return { ok: false, message: "Too many messages. Please try again later." };
  await db.contactMessage.create({ data: parsed.data });
  await notifyAdmins("New contact message", `${parsed.data.name}: ${parsed.data.subject}`);
  return { ok: true, message: "Thank you. Our team will reply within two working days." };
}
