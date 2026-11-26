export function usd(cents: number, opts: { compact?: boolean; decimals?: boolean } = {}) {
  const value = cents / 100;
  if (opts.compact && Math.abs(value) >= 10000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  const showDecimals = opts.decimals ?? cents % 100 !== 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(value);
}

export function num(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export function date(d: Date | string | null | undefined, style: "short" | "long" = "short") {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: style === "long" ? "long" : "short",
    day: "numeric",
  }).format(dt);
}

export function flag(country: string) {
  if (!country || country.length !== 2) return "🌐";
  const cc = country.toUpperCase();
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export const COUNTRIES: Record<string, string> = {
  US: "United States", LK: "Sri Lanka", GB: "United Kingdom", CA: "Canada", AU: "Australia",
  DE: "Germany", FR: "France", JP: "Japan", SG: "Singapore", AE: "United Arab Emirates",
  NZ: "New Zealand", NL: "Netherlands", NO: "Norway", SE: "Sweden", CH: "Switzerland",
  IN: "India", QA: "Qatar", KR: "South Korea", IT: "Italy", MY: "Malaysia",
};

export function countryName(cc: string) {
  return COUNTRIES[cc] ?? cc;
}

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function daysLeft(deadline: Date | null | undefined) {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

export function randomRef(prefix: string, len = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return `${prefix}-${s}`;
}
