import { db } from "./db";

export async function audit(userId: string | null | undefined, action: string, entity: string, entityId = "", detail = "") {
  await db.auditLog.create({ data: { userId: userId ?? null, action, entity, entityId, detail } });
}

export async function notifyAdmins(title: string, body: string) {
  await db.notification.create({ data: { userId: null, title, body } });
}

/** Email delivery. Without RESEND_API_KEY, messages are logged instead of sent. */
export async function sendEmail(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email:dev] to=${to} subject="${subject}"\n${text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text }),
  });
  if (!res.ok) console.error("[email] send failed", res.status, await res.text());
}
