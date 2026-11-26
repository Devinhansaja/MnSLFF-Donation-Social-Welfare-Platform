import "server-only";
import { redirect } from "next/navigation";
import { db } from "./db";

/** Redirect back with a flash message the admin shell displays as a toast. */
export function flash(path: string, message: string, ok = true): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${ok ? "ok" : "err"}=${encodeURIComponent(message)}`);
}

export function zodMessage(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const i = error.issues[0];
  return i ? `${i.path.length ? String(i.path[0]) + ": " : ""}${i.message}` : "Invalid input";
}

export function parseRange(sp: Record<string, string | undefined>) {
  const to = sp.to ? new Date(`${sp.to}T23:59:59`) : new Date();
  const from = sp.from ? new Date(`${sp.from}T00:00:00`) : new Date(to.getFullYear() - 1, to.getMonth() + 1, 1);
  return { from, to, fromStr: from.toISOString().slice(0, 10), toStr: to.toISOString().slice(0, 10) };
}

export async function lkrRate() {
  const r = await db.exchangeRate.findFirst({ where: { currency: "LKR" }, orderBy: { date: "desc" } });
  return r?.usdPerUnit ?? 0.0033;
}

/** Formats USD cents in USD or LKR (reporting conversion only). */
export function money(cents: number, cur: "USD" | "LKR", usdPerLkr: number) {
  if (cur === "LKR") {
    return new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 }).format(cents / 100 / usdPerLkr);
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
}

export function str(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}

export function dollarsToCents(v: string) {
  const n = Number(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

export async function nextProjectCode() {
  const year = new Date().getFullYear();
  const prefix = `MNS-${year}-`;
  const last = await db.project.findMany({ where: { code: { startsWith: prefix } }, select: { code: true } });
  const max = last.reduce((m, p) => Math.max(m, Number(p.code.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export const PAGE_SIZE = 25;
export function pageOf(sp: Record<string, string | undefined>) {
  const p = Math.max(1, Number(sp.page ?? 1) || 1);
  return { page: p, skip: (p - 1) * PAGE_SIZE, take: PAGE_SIZE };
}

export type SP = Promise<Record<string, string | undefined>>;
