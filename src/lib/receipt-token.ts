import crypto from "node:crypto";

/** Unguessable token that lets a donor open their receipt link without logging in. */
export function receiptToken(reference: string) {
  return crypto.createHmac("sha256", process.env.AUTH_SECRET ?? "").update(`receipt:${reference}`).digest("hex").slice(0, 32);
}

export function verifyReceiptToken(reference: string, token: string | null) {
  if (!token) return false;
  const expected = receiptToken(reference);
  return token.length === expected.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
