# MnSLFF Donation & Social Welfare Platform

A transparent, project-based donation platform for the **Minnesota Sri Lanka Friendship Foundation**:
public website, donor portal, sandbox payment flow, beneficiary applications, and a full admin panel
with dual-approval finance controls. All amounts are in **USD**, stored as integer cents.

> **Everything in the seeded database is demonstration data** (marked "Demo data" across the site).
> The sandbox gateway never moves real money.

## Quick start (Windows / macOS / Linux)

Requires Node.js 20.9+ (tested on Node 24).

```bash
npm install
cp .env.example .env        # then set AUTH_SECRET and SANDBOX_WEBHOOK_SECRET to long random strings
npm run setup               # creates prisma/dev.db and loads demo data
npm run dev                 # http://localhost:3000
```

npm may ask you to approve install scripts for `prisma`, `@prisma/client`, `@prisma/engines` and `esbuild`
(`npm install-scripts approve <name>`). They are required.

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm test` | Unit + database tests (uses a throwaway temp DB, never `dev.db`) |
| `npm run db:seed` | Wipes and reloads demo data |
| `npm run db:reset` | Drops the dev database and reseeds — **destroys all data** |

## Demo accounts (development only)

Defined in `prisma/seed.ts`. Delete or change them before going live.

| Role | Email | Password |
|---|---|---|
| Super Administrator | superadmin@mnslff.demo | Demo@Admin2026 |
| Finance Manager | finance@mnslff.demo | Demo@Staff2026 |
| Finance Officer | officer@mnslff.demo | Demo@Staff2026 |
| Project Manager | projects@mnslff.demo | Demo@Staff2026 |
| Verification Officer | verify@mnslff.demo | Demo@Staff2026 |
| Auditor | auditor@mnslff.demo | Demo@Staff2026 |
| Individual Donor | donor@mnslff.demo | Demo@Donor2026 |

Staff sign in at `/login` and land on `/admin`; donors land on `/account`.

## What's where

```
prisma/schema.prisma     Database schema (34 tables)
prisma/seed.ts           Demonstration data
src/lib/finance.ts       Pure money maths — single source of truth for every total
src/lib/donations.ts     confirmDonation / failDonation / applyRefund (transactional, idempotent)
src/lib/payments.ts      Gateway adapters (Sandbox live; Stripe, PayPal, Sampath, ComBank, WEBXPAY, DirectPay stubbed)
src/lib/rbac.ts          Roles, permissions, separation-of-duties rule
src/lib/reports.ts       Admin report generation (CSV / XLSX / PDF)
src/app/(site)/          Public website, checkout, donor portal
src/app/admin/           Admin panel
src/app/api/             Webhooks, receipts, reports, statements
storage/private/         Uploaded bank slips & application documents (never public)
```

## How money flows

1. Donor submits `/donate` → server creates a `Donation` with status `INITIATED` (card) or `PENDING` (bank transfer).
   The server, not the browser, sets the price of item sponsorships.
2. Card: donor pays on the provider's hosted page → provider calls `/api/webhooks/<gateway>` with a signed event.
   The webhook verifies the HMAC signature and timestamp, checks the amount, then calls `confirmDonation`.
3. Bank transfer: donor uploads a slip → a finance officer verifies it in Admin › Donations.
4. `confirmDonation` runs in one DB transaction: records the provider transaction (unique `providerRef` = idempotency),
   allocates item quantities with a conditional update (no over-allocation), marks the donation `PAID`,
   and writes append-only ledger entries. Only this path changes fundraising totals.
5. Refunds, expense payments and adjustments need a **second** authorised person (`/admin/approvals`).

Formulas (`src/lib/finance.ts`): gross = confirmed − refunds/reversals; net = gross − fees;
remaining = max(0, goal − gross); available = net − paid expenses; commitments and overfunding are tracked separately.

## Going live checklist

- [ ] **Photos:** `public/images/photos/*` were downloaded from atelierrk.com (MnSLFF's tsunami rebuilding gallery).
      Confirm you have the photographer's permission, or replace them, before the site is public.
- [ ] Replace demo data: `npm run db:reset` loads demo data — for production, create real staff accounts and remove the demo users.
- [ ] Move to PostgreSQL (e.g. Supabase): set `provider = "postgresql"` in `prisma/schema.prisma`, set `DATABASE_URL`, run `npx prisma migrate dev --name init`.
- [ ] Payment gateways: obtain merchant approval for charitable fundraising, implement the provider's webhook signature check in
      `src/lib/payments.ts`, add credentials to `.env`, then enable in Admin › Payment Gateway Settings.
- [ ] Real bank details in Admin › Website Settings (currently placeholder "DEMO BANK").
- [ ] Email: set `RESEND_API_KEY` (without it, emails are printed to the server log).
- [ ] Legal pages: have the template privacy / terms / donation / refund policies reviewed.
- [ ] Registration number and address in Website Settings.
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the real domain (used in receipts, sitemap, share links).

## Not yet implemented (honest list)

- Two-factor authentication for admins
- Antivirus scanning of uploads (hook is in `src/lib/uploads.ts`; file type and size are already checked by signature)
- Real gateway integrations (adapters exist; only the sandbox works end-to-end)
- Automated monthly recurring charges (monthly gifts are recorded; charging needs a gateway that supports subscriptions)
- WhatsApp notifications; email templates are editable but not yet used by the sender
- Email verification on donor sign-up (so guest donations are not auto-linked to accounts by email)
- Rate limiting is in-memory (use Redis/Upstash when running more than one server)
- Sinhala and Tamil cover navigation and homepage headlines; the rest of the site is English
