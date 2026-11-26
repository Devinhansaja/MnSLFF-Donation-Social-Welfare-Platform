import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { can, isStaff, type Permission } from "./rbac";
import { appSecret } from "./secrets";

const COOKIE = "mnslff_session";
const MAX_AGE = 60 * 60 * 8; // 8 hours

function secret() {
  const s = appSecret("AUTH_SECRET");
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set to at least 32 characters");
  return new TextEncoder().encode(s);
}

export type Session = { uid: string; role: string; name: string };

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(user: { id: string; role: string; name: string }) {
  const token = await new SignJWT({ role: user.role, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { uid: payload.sub as string, role: payload.role as string, name: payload.name as string };
  } catch {
    return null;
  }
}

/** Loads the user fresh from the DB so deactivated accounts or changed roles take effect immediately. */
export async function currentUser() {
  const s = await getSession();
  if (!s) return null;
  const user = await db.user.findUnique({ where: { id: s.uid }, include: { donor: true } });
  if (!user || !user.active) return null;
  return user;
}

export async function requireStaff(perm: Permission = "view") {
  const user = await currentUser();
  if (!user || !isStaff(user.role)) redirect("/login?next=/admin");
  if (!can(user.role, perm)) redirect("/admin?denied=1");
  return user;
}

export async function requireDonor() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account");
  return user;
}
