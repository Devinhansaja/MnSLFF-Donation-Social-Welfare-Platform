"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { isStaff } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";
import type { FormState } from "@/lib/form-utils";

function safeNext(next: string | null, fallback: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  if (!(await rateLimit("login", 10))) return { ok: false, message: "Too many sign-in attempts. Please wait 10 minutes." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  // Same message for unknown email and wrong password to avoid account enumeration.
  if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
    await audit(user?.id, "login.failed", "user", user?.id ?? "", email);
    return { ok: false, message: "Incorrect email or password." };
  }
  await createSession(user);
  await audit(user.id, "login", "user", user.id);
  redirect(safeNext(String(formData.get("next") ?? ""), isStaff(user.role) ? "/admin" : "/account"));
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(120),
  email: z.email("Please enter a valid email"),
  country: z.string().length(2, "Please choose your country"),
  password: z
    .string()
    .min(10, "Use at least 10 characters")
    .regex(/[A-Za-z]/, "Include a letter")
    .regex(/[0-9]/, "Include a number"),
});

export async function register(_: FormState, formData: FormData): Promise<FormState> {
  if (!(await rateLimit("register", 5))) return { ok: false, message: "Too many attempts. Please try again later." };
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const values = Object.fromEntries([...formData].filter(([k, v]) => k !== "password" && typeof v === "string")) as Record<string, string>;
    return { ok: false, message: "Please fix the highlighted fields.", errors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])), values };
  }
  const email = parsed.data.email.toLowerCase();
  if (await db.user.findUnique({ where: { email } })) return { ok: false, message: "An account with this email already exists. Please sign in." };
  const user = await db.user.create({
    data: { email, name: parsed.data.name, passwordHash: await hashPassword(parsed.data.password), role: "DONOR" },
  });
  // Earlier guest donations are NOT auto-linked by email: without email
  // verification that would let anyone view another person's giving history.
  // TODO(launch): add email verification, then link guest donor records by email.
  await db.donor.create({ data: { userId: user.id, fullName: parsed.data.name, email, country: parsed.data.country } });
  await createSession(user);
  await audit(user.id, "register", "user", user.id);
  redirect("/account");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
