import "server-only";
import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { db } from "./db";
import { CONFIRMED_STATUSES, donationGross, projectFinance, sumDonations } from "./finance";
import { getProjects } from "./queries";
import { countryName } from "./format";

export type Column = { key: string; label: string; money?: boolean; width?: number };
export type Report = {
  title: string;
  from: Date;
  to: Date;
  currency: "USD";
  columns: Column[];
  rows: Record<string, string | number | null>[];
  summary: [string, string | number, boolean?][]; // [label, value, isMoney]
  note?: string;
};

export const REPORT_TYPES: Record<string, { label: string; perm: "export" | "content.edit"; ranged: boolean; defaultRange: "day" | "month" | "year" | "all" }> = {
  daily: { label: "Daily donation report", perm: "export", ranged: true, defaultRange: "day" },
  monthly: { label: "Monthly donation report", perm: "export", ranged: true, defaultRange: "month" },
  annual: { label: "Annual financial report", perm: "export", ranged: true, defaultRange: "year" },
  "project-donations": { label: "Project-wise donation report", perm: "export", ranged: true, defaultRange: "year" },
  "project-expenses": { label: "Project expense report", perm: "export", ranged: true, defaultRange: "year" },
  donors: { label: "Donor contribution report", perm: "export", ranged: true, defaultRange: "year" },
  gateway: { label: "Payment gateway report", perm: "export", ranged: true, defaultRange: "month" },
  pending: { label: "Pending payment report", perm: "export", ranged: false, defaultRange: "all" },
  reconciliation: { label: "Bank reconciliation report", perm: "export", ranged: true, defaultRange: "month" },
  allocation: { label: "Fund allocation report", perm: "export", ranged: true, defaultRange: "year" },
  completed: { label: "Completed project report", perm: "export", ranged: false, defaultRange: "all" },
  impact: { label: "Beneficiary impact report", perm: "export", ranged: false, defaultRange: "all" },
  csr: { label: "Corporate CSR report", perm: "export", ranged: true, defaultRange: "year" },
  audit: { label: "Audit report", perm: "export", ranged: true, defaultRange: "month" },
  subscribers: { label: "Newsletter subscribers", perm: "content.edit", ranged: false, defaultRange: "all" },
};

export function resolveRange(type: string, fromStr?: string | null, toStr?: string | null) {
  const now = new Date();
  const def = REPORT_TYPES[type]?.defaultRange ?? "month";
  let from: Date;
  if (fromStr) from = new Date(`${fromStr}T00:00:00`);
  else if (def === "day") from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  else if (def === "month") from = new Date(now.getFullYear(), now.getMonth(), 1);
  else if (def === "year") from = new Date(now.getFullYear(), 0, 1);
  else from = new Date(2000, 0, 1);
  const to = toStr ? new Date(`${toStr}T23:59:59.999`) : now;
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) throw new Error("Invalid date range");
  return { from, to };
}

const d10 = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");
const confirmedIn = (from: Date, to: Date) => ({ status: { in: [...CONFIRMED_STATUSES] }, confirmedAt: { gte: from, lte: to } });

async function cashFlow(title: string, from: Date, to: Date): Promise<Report> {
  const [openingAgg, entries] = await Promise.all([
    db.ledgerEntry.aggregate({ where: { createdAt: { lt: from } }, _sum: { amountCents: true } }),
    db.ledgerEntry.findMany({ where: { createdAt: { gte: from, lte: to } }, orderBy: { createdAt: "asc" }, include: { project: { select: { code: true } } } }),
  ]);
  const opening = openingAgg._sum.amountCents ?? 0;
  const by = (t: string) => entries.filter((e) => e.type === t).reduce((s, e) => s + e.amountCents, 0);
  const movement = entries.reduce((s, e) => s + e.amountCents, 0);
  return {
    title, from, to, currency: "USD",
    columns: [{ key: "date", label: "Date", width: 1 }, { key: "type", label: "Type", width: 1 }, { key: "fund", label: "Fund", width: 1.2 }, { key: "memo", label: "Description", width: 4 }, { key: "amount", label: "Amount", money: true, width: 1.2 }],
    rows: entries.map((e) => ({ date: d10(e.createdAt), type: e.type, fund: e.project?.code ?? "General", memo: e.memo, amount: e.amountCents })),
    summary: [
      ["Opening balance", opening, true],
      ["Donations received (gross)", by("DONATION"), true],
      ["Processing fees", by("FEE"), true],
      ["Refunds", by("REFUND"), true],
      ["Expenses paid", by("EXPENSE"), true],
      ["Adjustments & transfers", by("ADJUSTMENT") + by("TRANSFER"), true],
      ["Net movement", movement, true],
      ["Closing balance", opening + movement, true],
      ["Transactions", entries.length],
    ],
    note: "Balances are taken from the immutable financial ledger.",
  };
}

export async function buildReport(type: string, from: Date, to: Date): Promise<Report> {
  const label = REPORT_TYPES[type]?.label ?? type;
  switch (type) {
    case "daily":
    case "monthly":
    case "annual":
      return cashFlow(label, from, to);

    case "project-donations": {
      const projects = await db.project.findMany({ orderBy: { code: "asc" }, include: { donations: { where: confirmedIn(from, to), select: { amountCents: true, feeCents: true, refundedCents: true, status: true, donorId: true } } } });
      const general = await db.donation.findMany({ where: { projectId: null, ...confirmedIn(from, to) }, select: { amountCents: true, feeCents: true, refundedCents: true, status: true, donorId: true } });
      const rows = [...projects.map((p) => ({ code: p.code, title: p.title, list: p.donations, goal: p.goalCents })), { code: "GENERAL", title: "General foundation fund", list: general, goal: 0 }]
        .map((p) => { const t = sumDonations(p.list); return { code: p.code, title: p.title, donations: t.count, donors: new Set(p.list.map((x) => x.donorId)).size, gross: t.gross, refunds: t.refunds, fees: t.fees, net: t.net }; })
        .filter((r) => r.donations > 0);
      const t = (k: "gross" | "fees" | "net" | "refunds") => rows.reduce((s, r) => s + r[k], 0);
      return {
        title: label, from, to, currency: "USD",
        columns: [{ key: "code", label: "Project ID" }, { key: "title", label: "Project", width: 3 }, { key: "donations", label: "Gifts" }, { key: "donors", label: "Donors" }, { key: "gross", label: "Gross", money: true }, { key: "refunds", label: "Refunds", money: true }, { key: "fees", label: "Fees", money: true }, { key: "net", label: "Net", money: true }],
        rows, summary: [["Gross", t("gross"), true], ["Refunds", t("refunds"), true], ["Fees", t("fees"), true], ["Net", t("net"), true]],
      };
    }

    case "project-expenses": {
      const rows = await db.expense.findMany({ where: { date: { gte: from, lte: to } }, orderBy: { date: "asc" }, include: { project: { select: { code: true } }, milestone: { select: { title: true } } } });
      const sum = (s: string) => rows.filter((r) => r.status === s).reduce((a, r) => a + r.amountCents, 0);
      return {
        title: label, from, to, currency: "USD",
        columns: [{ key: "date", label: "Date" }, { key: "project", label: "Project" }, { key: "title", label: "Expense", width: 2.5 }, { key: "category", label: "Category" }, { key: "milestone", label: "Milestone", width: 1.4 }, { key: "status", label: "Status" }, { key: "amount", label: "Amount", money: true }],
        rows: rows.map((e) => ({ date: d10(e.date), project: e.project?.code ?? (e.administrative ? "ADMIN" : "General"), title: e.title, category: e.category, milestone: e.milestone?.title ?? "", status: e.status, amount: e.amountCents })),
        summary: [["Paid", sum("PAID"), true], ["Approved commitments", sum("APPROVED"), true], ["Pending approval", sum("PENDING"), true], ["Rejected", sum("REJECTED"), true]],
      };
    }

    case "donors":
    case "csr": {
      const donors = await db.donor.findMany({
        where: type === "csr" ? { donorType: { in: ["CORPORATE", "ORGANIZATION"] } } : {},
        include: { donations: { where: confirmedIn(from, to), include: { project: { select: { code: true, title: true } } } } },
      });
      const rows = donors
        .filter((d) => d.donations.length)
        .flatMap((d): { donor: string; company: string; type: string; country: string; gifts: number; gross: number; project?: string; projects?: number }[] => {
          if (type === "donors") {
            const t = sumDonations(d.donations);
            return [{ donor: d.fullName, company: d.companyName ?? "", type: d.donorType, country: countryName(d.country), gifts: t.count, projects: new Set(d.donations.map((x) => x.projectId ?? "general")).size, gross: t.gross }];
          }
          const byProject = new Map<string, typeof d.donations>();
          for (const x of d.donations) { const k = x.project ? `${x.project.code} ${x.project.title}` : "General fund"; byProject.set(k, [...(byProject.get(k) ?? []), x]); }
          return [...byProject.entries()].map(([proj, list]) => ({ donor: d.companyName ?? d.fullName, company: d.fullName, type: d.donorType, country: countryName(d.country), project: proj, gifts: list.length, gross: list.reduce((s, x) => s + donationGross(x), 0) }));
        })
        .sort((a, b) => b.gross - a.gross);
      const total = rows.reduce((s, r) => s + r.gross, 0);
      return {
        title: label, from, to, currency: "USD",
        columns: type === "donors"
          ? [{ key: "donor", label: "Donor", width: 2 }, { key: "company", label: "Company", width: 1.5 }, { key: "type", label: "Type" }, { key: "country", label: "Country", width: 1.3 }, { key: "gifts", label: "Gifts" }, { key: "projects", label: "Projects" }, { key: "gross", label: "Gross", money: true }]
          : [{ key: "donor", label: "Organisation", width: 2 }, { key: "company", label: "Contact", width: 1.5 }, { key: "country", label: "Country" }, { key: "project", label: "Project supported", width: 3 }, { key: "gifts", label: "Gifts" }, { key: "gross", label: "Contribution", money: true }],
        rows: rows.map((r) => ({ ...r, project: r.project ?? null, projects: r.projects ?? null })), summary: [["Donors / lines", rows.length], ["Total contributions", total, true]],
        note: "Contains private donor information — internal use only.",
      };
    }

    case "gateway": {
      const rows = await db.donation.findMany({ where: confirmedIn(from, to), select: { method: true, amountCents: true, feeCents: true, refundedCents: true, status: true, coveredFeeCents: true } });
      const methods = [...new Set(rows.map((r) => r.method))];
      const out = methods.map((m) => { const sub = rows.filter((r) => r.method === m); const t = sumDonations(sub); return { method: m, count: t.count, gross: t.gross, covered: sub.reduce((s, r) => s + r.coveredFeeCents, 0), fees: t.fees, net: t.net }; });
      const t = sumDonations(rows);
      return {
        title: label, from, to, currency: "USD",
        columns: [{ key: "method", label: "Gateway / method", width: 2 }, { key: "count", label: "Payments" }, { key: "gross", label: "Gross", money: true }, { key: "covered", label: "Donor-covered fees", money: true }, { key: "fees", label: "Net fee cost", money: true }, { key: "net", label: "Net settlement", money: true }],
        rows: out, summary: [["Gross", t.gross, true], ["Fees", t.fees, true], ["Net", t.net, true]],
      };
    }

    case "pending": {
      const rows = await db.donation.findMany({ where: { status: { in: ["INITIATED", "PENDING", "PROCESSING"] } }, orderBy: { createdAt: "asc" }, include: { donor: true, project: { select: { code: true } }, bankTransfer: true } });
      return {
        title: label, from, to, currency: "USD",
        columns: [{ key: "date", label: "Created" }, { key: "ref", label: "Reference" }, { key: "donor", label: "Donor", width: 1.8 }, { key: "project", label: "Project" }, { key: "method", label: "Method" }, { key: "bankRef", label: "Bank ref" }, { key: "status", label: "Status" }, { key: "amount", label: "Amount", money: true }],
        rows: rows.map((d) => ({ date: d10(d.createdAt), ref: d.reference, donor: d.donor.fullName, project: d.project?.code ?? "General", method: d.method, bankRef: d.bankTransfer?.bankRef ?? "", status: d.status, amount: d.amountCents })),
        summary: [["Pending payments", rows.length], ["Total pending (not counted in totals)", rows.reduce((s, d) => s + d.amountCents, 0), true]],
      };
    }

    case "reconciliation": {
      const rows = await db.transaction.findMany({ where: { status: "PAID", createdAt: { gte: from, lte: to } }, orderBy: { createdAt: "asc" }, include: { donation: { select: { reference: true, bankTransfer: { select: { bankRef: true } } } } } });
      const s = (st: string) => rows.filter((r) => r.settlement === st).reduce((a, r) => a + r.netCents, 0);
      return {
        title: label, from, to, currency: "USD",
        columns: [{ key: "date", label: "Date" }, { key: "ref", label: "Donation" }, { key: "gateway", label: "Gateway" }, { key: "providerRef", label: "Provider / bank ref", width: 2 }, { key: "gross", label: "Gross", money: true }, { key: "fee", label: "Fee", money: true }, { key: "net", label: "Net", money: true }, { key: "settlement", label: "Settlement" }],
        rows: rows.map((t) => ({ date: d10(t.createdAt), ref: t.donation.reference, gateway: t.gateway, providerRef: t.donation.bankTransfer?.bankRef ?? t.providerRef, gross: t.amountCents, fee: t.feeCents, net: t.netCents, settlement: t.settlement })),
        summary: [["Unsettled (net)", s("UNSETTLED"), true], ["Settled (net)", s("SETTLED"), true], ["Reconciled (net)", s("RECONCILED"), true], ["Expected bank receipts (net)", rows.reduce((a, r) => a + r.netCents, 0), true]],
      };
    }

    case "allocation": {
      const [before, during, projects] = await Promise.all([
        db.ledgerEntry.groupBy({ by: ["projectId"], where: { createdAt: { lt: from } }, _sum: { amountCents: true } }),
        db.ledgerEntry.groupBy({ by: ["projectId", "type"], where: { createdAt: { gte: from, lte: to } }, _sum: { amountCents: true } }),
        db.project.findMany({ select: { id: true, code: true, title: true }, orderBy: { code: "asc" } }),
      ]);
      const funds = [...projects.map((p) => ({ id: p.id as string | null, code: p.code, title: p.title })), { id: null, code: "GENERAL", title: "General fund" }];
      const v = (id: string | null, t: string) => during.find((g) => g.projectId === id && g.type === t)?._sum.amountCents ?? 0;
      const rows = funds.map((f) => {
        const opening = before.find((g) => g.projectId === f.id)?._sum.amountCents ?? 0;
        const inflow = v(f.id, "DONATION");
        const out = v(f.id, "FEE") + v(f.id, "REFUND") + v(f.id, "EXPENSE");
        const adj = v(f.id, "ADJUSTMENT") + v(f.id, "TRANSFER");
        return { code: f.code, title: f.title, opening, inflow, out, adj, closing: opening + inflow + out + adj };
      });
      const t = (k: "opening" | "inflow" | "out" | "adj" | "closing") => rows.reduce((s, r) => s + r[k], 0);
      return {
        title: label, from, to, currency: "USD",
        columns: [{ key: "code", label: "Fund" }, { key: "title", label: "Name", width: 2.5 }, { key: "opening", label: "Opening", money: true }, { key: "inflow", label: "Donations", money: true }, { key: "out", label: "Fees/refunds/expenses", money: true, width: 1.5 }, { key: "adj", label: "Adjustments", money: true }, { key: "closing", label: "Closing", money: true }],
        rows, summary: [["Opening balance", t("opening"), true], ["Donations", t("inflow"), true], ["Outflows", t("out"), true], ["Adjustments", t("adj"), true], ["Closing balance", t("closing"), true]],
      };
    }

    case "completed": {
      const projects = await db.project.findMany({ where: { status: { in: ["COMPLETED", "CLOSED"] } }, include: { donations: { where: { status: { in: [...CONFIRMED_STATUSES] } }, select: { amountCents: true, feeCents: true, refundedCents: true, status: true } }, expenses: { select: { amountCents: true, status: true } } } });
      const rows = projects.map((p) => { const f = projectFinance(p, p.donations, p.expenses); return { code: p.code, title: p.title, completed: d10(p.completedAt), goal: f.goal, gross: f.gross, fees: f.fees, net: f.net, spent: f.expensesPaid, balance: f.available, beneficiaries: p.finalBeneficiaries || p.directBeneficiaries }; });
      return {
        title: label, from, to, currency: "USD",
        columns: [{ key: "code", label: "ID" }, { key: "title", label: "Project", width: 2.5 }, { key: "completed", label: "Completed" }, { key: "goal", label: "Target", money: true }, { key: "gross", label: "Collected", money: true }, { key: "fees", label: "Fees", money: true }, { key: "net", label: "Net", money: true }, { key: "spent", label: "Expenditure", money: true }, { key: "balance", label: "Remaining", money: true }, { key: "beneficiaries", label: "Beneficiaries" }],
        rows, summary: [["Completed projects", rows.length], ["Total expenditure", rows.reduce((s, r) => s + r.spent, 0), true], ["Total beneficiaries", rows.reduce((s, r) => s + r.beneficiaries, 0)]],
      };
    }

    case "impact": {
      const projects = await getProjects({ status: { notIn: ["DRAFT", "CANCELLED"] } }, [{ code: "asc" }]);
      const rows = projects.map((p) => ({ code: p.code, title: p.title, status: p.status, district: p.district, families: p.families, children: p.children, students: p.students, elderly: p.elderly, direct: p.finalBeneficiaries || p.directBeneficiaries, indirect: p.indirectBeneficiaries }));
      const s = (k: "families" | "children" | "students" | "elderly" | "direct" | "indirect") => rows.reduce((a, r) => a + r[k], 0);
      return {
        title: label, from, to, currency: "USD",
        columns: [{ key: "code", label: "ID" }, { key: "title", label: "Project", width: 2.5 }, { key: "status", label: "Status" }, { key: "district", label: "District" }, { key: "families", label: "Families" }, { key: "children", label: "Children" }, { key: "students", label: "Students" }, { key: "elderly", label: "Elderly" }, { key: "direct", label: "Direct" }, { key: "indirect", label: "Indirect" }],
        rows, summary: [["Families", s("families")], ["Children", s("children")], ["Students", s("students")], ["Elderly", s("elderly")], ["Direct beneficiaries", s("direct")], ["Indirect beneficiaries", s("indirect")]],
        note: "Aggregated, anonymised figures only.",
      };
    }

    case "audit": {
      const rows = await db.auditLog.findMany({ where: { createdAt: { gte: from, lte: to } }, orderBy: { createdAt: "asc" }, include: { user: { select: { name: true } } } });
      return {
        title: label, from, to, currency: "USD",
        columns: [{ key: "time", label: "Time (UTC)", width: 1.4 }, { key: "user", label: "User", width: 1.3 }, { key: "action", label: "Action", width: 1.4 }, { key: "entity", label: "Entity" }, { key: "entityId", label: "Entity ID", width: 1.3 }, { key: "detail", label: "Detail", width: 3 }],
        rows: rows.map((l) => ({ time: l.createdAt.toISOString().replace("T", " ").slice(0, 19), user: l.user?.name ?? "System", action: l.action, entity: l.entity, entityId: l.entityId, detail: l.detail })),
        summary: [["Events", rows.length]],
      };
    }

    case "subscribers": {
      const rows = await db.subscriber.findMany({ orderBy: { createdAt: "asc" } });
      return { title: label, from, to, currency: "USD", columns: [{ key: "email", label: "Email", width: 3 }, { key: "date", label: "Subscribed" }], rows: rows.map((r) => ({ email: r.email, date: d10(r.createdAt) })), summary: [["Subscribers", rows.length]] };
    }
  }
  throw new Error("Unknown report");
}

// ---------- Exporters ----------

const moneyStr = (c: number) => (c / 100).toFixed(2);
const cell = (col: Column, v: string | number | null) => (v === null || v === undefined ? "" : col.money && typeof v === "number" ? moneyStr(v) : String(v));

function header(r: Report) {
  return [
    `Minnesota Sri Lanka Friendship Foundation — ${r.title}`,
    `Reporting period: ${d10(r.from)} to ${d10(r.to)} · Currency: ${r.currency} · Generated: ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`,
  ];
}

export function toCsv(r: Report) {
  const esc = (s: string) => {
    // neutralise spreadsheet formula injection
    const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const lines = [
    ...header(r).map((h) => esc(h)),
    "",
    r.columns.map((c) => esc(c.money ? `${c.label} (USD)` : c.label)).join(","),
    ...r.rows.map((row) => r.columns.map((c) => esc(cell(c, row[c.key]))).join(",")),
    "",
    ...r.summary.map(([l, v, m]) => `${esc(l)},${esc(m && typeof v === "number" ? moneyStr(v) : String(v))}`),
    ...(r.note ? ["", esc(r.note)] : []),
  ];
  return "﻿" + lines.join("\r\n");
}

export async function toXlsx(r: Report) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "MnSLFF platform";
  const ws = wb.addWorksheet(r.title.slice(0, 31));
  header(r).forEach((h, i) => { ws.addRow([h]); ws.getRow(i + 1).font = i === 0 ? { bold: true, size: 13 } : { italic: true, color: { argb: "FF64748B" } }; });
  ws.addRow([]);
  const hr = ws.addRow(r.columns.map((c) => (c.money ? `${c.label} (USD)` : c.label)));
  hr.font = { bold: true, color: { argb: "FFFFFFFF" } };
  hr.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF185C44" } }; });
  for (const row of r.rows) {
    const added = ws.addRow(r.columns.map((c) => { const v = row[c.key]; return c.money && typeof v === "number" ? v / 100 : v ?? ""; }));
    r.columns.forEach((c, i) => { if (c.money) added.getCell(i + 1).numFmt = '"$"#,##0.00;[Red]-"$"#,##0.00'; });
  }
  ws.addRow([]);
  for (const [l, v, m] of r.summary) {
    const sr = ws.addRow([l, m && typeof v === "number" ? v / 100 : v]);
    sr.font = { bold: true };
    if (m) sr.getCell(2).numFmt = '"$"#,##0.00;[Red]-"$"#,##0.00';
  }
  if (r.note) ws.addRow([r.note]);
  r.columns.forEach((c, i) => { ws.getColumn(i + 1).width = Math.max(12, Math.round(14 * (c.width ?? 1))); });
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// Standard PDF fonts only cover WinAnsi; replace anything else.
const pdfSafe = (s: string) => s.replace(/[—–]/g, "-").replace(/[·•]/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/→/g, "->").replace(/…/g, "...").replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");

function fit(text: string, font: PDFFont, size: number, max: number) {
  let t = pdfSafe(text);
  if (font.widthOfTextAtSize(t, size) <= max) return t;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}...`, size) > max) t = t.slice(0, -1);
  return `${t}...`;
}

export async function toPdf(r: Report) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(r.title);
  pdf.setProducer("MnSLFF platform");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 842, H = 595, M = 36; // A4 landscape
  const forest = rgb(0.094, 0.36, 0.267), navy = rgb(0.09, 0.17, 0.23), muted = rgb(0.39, 0.45, 0.55);
  const totalW = r.columns.reduce((s, c) => s + (c.width ?? 1), 0);
  const colW = r.columns.map((c) => ((W - 2 * M) * (c.width ?? 1)) / totalW);
  let page = pdf.addPage([W, H]);
  let y = H - M;
  let pageNo = 1;

  const drawHeader = () => {
    const [h1, h2] = header(r);
    page.drawText(fit(h1, bold, 13, W - 2 * M), { x: M, y: y - 12, size: 13, font: bold, color: forest });
    page.drawText(fit(h2, font, 8.5, W - 2 * M), { x: M, y: y - 26, size: 8.5, font, color: muted });
    y -= 44;
    page.drawRectangle({ x: M, y: y - 4, width: W - 2 * M, height: 16, color: forest });
    let x = M;
    r.columns.forEach((c, i) => {
      const label = fit(c.money ? `${c.label} (USD)` : c.label, bold, 7.5, colW[i] - 6);
      const tx = c.money ? x + colW[i] - 3 - bold.widthOfTextAtSize(label, 7.5) : x + 3;
      page.drawText(label, { x: tx, y: y, size: 7.5, font: bold, color: rgb(1, 1, 1) });
      x += colW[i];
    });
    y -= 16;
  };
  const footer = () => page.drawText(`Page ${pageNo}`, { x: W - M - 40, y: 18, size: 8, font, color: muted });

  drawHeader();
  r.rows.forEach((row, ri) => {
    if (y < M + 30) { footer(); page = pdf.addPage([W, H]); pageNo++; y = H - M; drawHeader(); }
    if (ri % 2 === 1) page.drawRectangle({ x: M, y: y - 4, width: W - 2 * M, height: 14, color: rgb(0.97, 0.96, 0.94) });
    let x = M;
    r.columns.forEach((c, i) => {
      const txt = fit(cell(c, row[c.key]), font, 7.5, colW[i] - 6);
      const tx = c.money ? x + colW[i] - 3 - font.widthOfTextAtSize(txt, 7.5) : x + 3;
      page.drawText(txt, { x: tx, y, size: 7.5, font, color: navy });
      x += colW[i];
    });
    y -= 14;
  });
  if (!r.rows.length) { page.drawText("No records in this period.", { x: M, y, size: 9, font, color: muted }); y -= 16; }

  y -= 10;
  const needed = r.summary.length * 14 + 30;
  if (y < M + needed) { footer(); page = pdf.addPage([W, H]); pageNo++; y = H - M; }
  page.drawText("Summary", { x: M, y, size: 10, font: bold, color: forest });
  y -= 16;
  for (const [l, v, m] of r.summary) {
    page.drawText(pdfSafe(l), { x: M, y, size: 9, font, color: navy });
    const val = m && typeof v === "number" ? `$${(v / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : String(v);
    page.drawText(pdfSafe(val), { x: M + 260 - bold.widthOfTextAtSize(pdfSafe(val), 9), y, size: 9, font: bold, color: navy });
    y -= 14;
  }
  if (r.note) page.drawText(fit(r.note, font, 8, W - 2 * M), { x: M, y: y - 6, size: 8, font, color: muted });
  footer();
  return Buffer.from(await pdf.save());
}
