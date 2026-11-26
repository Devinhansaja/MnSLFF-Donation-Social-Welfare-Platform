"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function setLanguage(formData: FormData) {
  const lang = String(formData.get("lang") ?? "en");
  const value = ["en", "si", "ta"].includes(lang) ? lang : "en";
  (await cookies()).set("lang", value, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}
