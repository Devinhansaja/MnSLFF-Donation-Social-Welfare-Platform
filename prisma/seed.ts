/**
 * DEMONSTRATION SEED DATA
 * Every project, donor, donation and testimonial created here is fictional and
 * flagged with isDemo = true. Nothing here represents a real achievement.
 *
 * Demo logins (development only — change or delete before going live):
 *   superadmin@mnslff.demo   / Demo@Admin2026   (Super Administrator)
 *   finance@mnslff.demo      / Demo@Staff2026   (Finance Manager)
 *   officer@mnslff.demo      / Demo@Staff2026   (Finance Officer)
 *   projects@mnslff.demo     / Demo@Staff2026   (Project Manager)
 *   verify@mnslff.demo       / Demo@Staff2026   (Verification Officer)
 *   auditor@mnslff.demo      / Demo@Staff2026   (Auditor)
 *   donor@mnslff.demo        / Demo@Donor2026   (Individual Donor)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const P = "/images/photos/";

// deterministic pseudo-random so the seed is reproducible
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);
const daysAhead = (n: number) => new Date(Date.now() + n * 86400000);
const fee = (cents: number) => Math.round(cents * 0.029 + 30);

let refCounter = 1000;
const nextRef = () => `DN-DEMO${++refCounter}`;

async function main() {
  console.log("Resetting database…");
  // order matters for FKs
  await db.ledgerEntry.deleteMany();
  await db.approvalRequest.deleteMany();
  await db.transaction.deleteMany();
  await db.bankTransfer.deleteMany();
  await db.refund.deleteMany();
  await db.donation.deleteMany();
  await db.expense.deleteMany();
  await db.budgetItem.deleteMany();
  await db.media.deleteMany();
  await db.milestone.deleteMany();
  await db.projectUpdate.deleteMany();
  await db.projectDocument.deleteMany();
  await db.savedProject.deleteMany();
  await db.project.deleteMany();
  await db.category.deleteMany();
  await db.donor.deleteMany();
  await db.notification.deleteMany();
  await db.auditLog.deleteMany();
  await db.user.deleteMany();
  await db.application.deleteMany();
  await db.testimonial.deleteMany();
  await db.paymentGateway.deleteMany();
  await db.exchangeRate.deleteMany();
  await db.setting.deleteMany();
  await db.storedFile.deleteMany();

  // ---------- Settings ----------
  const settings: Record<string, string> = {
    orgName: "Minnesota Sri Lanka Friendship Foundation",
    orgShort: "MnSLFF",
    tagline: "Every project is visible. Every donation is accountable. Every contribution creates real impact.",
    description:
      "A friendship foundation connecting generous people around the world with verified community projects across Sri Lanka — homes, schools, clean water and care for families in need.",
    email: "hello@mnslff.example",
    phone: "+1 (612) 555-0142",
    address: "Minneapolis, Minnesota, USA · Colombo, Sri Lanka",
    registration: "Registration details pending — configure in Admin › Website Settings",
    bankName: "DEMO BANK — replace before launch",
    bankAccountName: "Minnesota Sri Lanka Friendship Foundation",
    bankAccountNo: "0000-0000-0000 (demo)",
    bankSwift: "DEMOXXXX",
    bankBranch: "Demo Branch",
    feePercent: "2.9",
    feeFixedCents: "30",
    heroImages: JSON.stringify([`${P}13-slk-lg.jpg`, `${P}04-slk-lg.jpg`, `${P}11-slk-lg.jpg`, `${P}05-slk-lg.jpg`]),
    statFamilies: "", // blank = computed from projects
    social_facebook: "https://facebook.com",
    social_instagram: "https://instagram.com",
    social_youtube: "https://youtube.com",
    social_linkedin: "https://linkedin.com",
  };
  for (const [key, value] of Object.entries(settings)) await db.setting.create({ data: { key, value } });

  await db.exchangeRate.create({ data: { currency: "LKR", usdPerUnit: 0.0033 } });

  const gateways = [
    { code: "SANDBOX", name: "Card payment (Sandbox)", description: "Simulated hosted payment page for testing. No real money moves.", enabled: true, sandbox: true },
    { code: "BANK_TRANSFER", name: "Bank transfer", description: "Local or international transfer. Confirmed after finance staff verify the slip.", enabled: true, sandbox: false },
    { code: "STRIPE", name: "Stripe", description: "International cards. Requires approved Stripe account.", enabled: false, sandbox: true },
    { code: "PAYPAL", name: "PayPal", description: "PayPal and cards. Requires approved PayPal account.", enabled: false, sandbox: true },
    { code: "SAMPATH_IPG", name: "Sampath Bank IPG", description: "Sri Lankan card gateway.", enabled: false, sandbox: true },
    { code: "COMBANK_IPG", name: "Commercial Bank IPG", description: "Sri Lankan card gateway.", enabled: false, sandbox: true },
    { code: "WEBXPAY", name: "WEBXPAY", description: "Sri Lankan payment aggregator.", enabled: false, sandbox: true },
    { code: "DIRECTPAY", name: "DirectPay", description: "Sri Lankan payment aggregator.", enabled: false, sandbox: true },
    { code: "MANUAL", name: "Manual / offline", description: "Cash or cheque recorded by finance staff.", enabled: true, sandbox: false },
  ];
  for (const [i, g] of gateways.entries()) await db.paymentGateway.create({ data: { ...g, sortOrder: i } });

  // ---------- Users ----------
  const adminPw = await bcrypt.hash("Demo@Admin2026", 12);
  const staffPw = await bcrypt.hash("Demo@Staff2026", 12);
  const donorPw = await bcrypt.hash("Demo@Donor2026", 12);
  const superAdmin = await db.user.create({ data: { email: "superadmin@mnslff.demo", name: "Demo Super Admin", passwordHash: adminPw, role: "SUPER_ADMIN" } });
  const finance = await db.user.create({ data: { email: "finance@mnslff.demo", name: "Demo Finance Manager", passwordHash: staffPw, role: "FINANCE_MANAGER" } });
  const officer = await db.user.create({ data: { email: "officer@mnslff.demo", name: "Demo Finance Officer", passwordHash: staffPw, role: "FINANCE_OFFICER" } });
  await db.user.create({ data: { email: "projects@mnslff.demo", name: "Demo Project Manager", passwordHash: staffPw, role: "PROJECT_MANAGER" } });
  await db.user.create({ data: { email: "verify@mnslff.demo", name: "Demo Verification Officer", passwordHash: staffPw, role: "VERIFICATION_OFFICER" } });
  await db.user.create({ data: { email: "auditor@mnslff.demo", name: "Demo Auditor", passwordHash: staffPw, role: "AUDITOR" } });
  const donorUser = await db.user.create({ data: { email: "donor@mnslff.demo", name: "Alex Morgan (Demo)", passwordHash: donorPw, role: "DONOR" } });

  // ---------- Categories ----------
  const cats = [
    ["family-support", "Family Support", "Essential help for families facing hardship.", "12-slk-lg.jpg", "HeartHandshake"],
    ["school-development", "School Development", "Classrooms, libraries and furniture for rural schools.", "05-slk-lg.jpg", "School"],
    ["childrens-education", "Children's Education", "Books, uniforms and scholarships that keep children learning.", "11-slk-lg.jpg", "GraduationCap"],
    ["medical-assistance", "Medical Assistance", "Treatment, medicines and clinic support.", "14-slk-lg.jpg", "Stethoscope"],
    ["housing-development", "Housing Development", "Safe, durable homes for families in need.", "06-slk-lg.jpg", "Home"],
    ["food-distribution", "Food Distribution", "Dry rations and nutrition packs for vulnerable households.", "07-slk-lg.jpg", "Wheat"],
    ["elderly-care", "Elderly Care", "Dignified care and support for senior citizens.", "09-slk-lg.jpg", "HandHeart"],
    ["clean-water", "Clean Water", "Wells, filters and water systems for rural villages.", "22-slk-lg.jpg", "Droplets"],
    ["emergency-relief", "Emergency Relief", "Rapid support after floods, storms and disasters.", "20-slk-lg.jpg", "Siren"],
    ["community-development", "Community Development", "Shared spaces that strengthen whole villages.", "04-slk-lg.jpg", "Users"],
    ["disability-support", "Disability Support", "Mobility aids, access and inclusion.", "15-slk-lg.jpg", "Accessibility"],
    ["livelihood-development", "Livelihood Development", "Skills, tools and small-business support.", "03-slk-lg.jpg", "Sprout"],
  ];
  const catId: Record<string, string> = {};
  for (const [i, [slug, name, description, img, icon]] of cats.entries()) {
    const c = await db.category.create({ data: { slug, name, description, image: P + img, icon, sortOrder: i } });
    catId[slug] = c.id;
  }

  // ---------- Donors ----------
  const donorSeeds: [string, string, string, string?][] = [
    ["Alex Morgan", "US", "INDIVIDUAL"],
    ["Priya Fernando", "AU", "INDIVIDUAL"],
    ["Daniel Okafor", "GB", "INDIVIDUAL"],
    ["Sofia Lindqvist", "SE", "INDIVIDUAL"],
    ["Kenji Watanabe", "JP", "INDIVIDUAL"],
    ["Nuwan Perera", "LK", "INDIVIDUAL"],
    ["Hannah Becker", "DE", "INDIVIDUAL"],
    ["Ravi Kumar", "IN", "INDIVIDUAL"],
    ["Emily Carter", "CA", "INDIVIDUAL"],
    ["Lake Country Builders (Demo Co.)", "US", "CORPORATE", "Lake Country Builders"],
    ["Northstar Tech CSR (Demo Co.)", "US", "CORPORATE", "Northstar Tech"],
    ["Dilani Jayasuriya", "LK", "INDIVIDUAL"],
    ["Marco Rossi", "IT", "INDIVIDUAL"],
    ["Aisha Rahman", "AE", "INDIVIDUAL"],
    ["Liam O'Brien", "NZ", "INDIVIDUAL"],
    ["Mei Lin Tan", "SG", "INDIVIDUAL"],
    ["Grace Johnson", "US", "INDIVIDUAL"],
    ["Twin Cities Rotary (Demo Org.)", "US", "ORGANIZATION", "Twin Cities Rotary"],
    ["Thomas Müller", "CH", "INDIVIDUAL"],
    ["Chamari Silva", "LK", "INDIVIDUAL"],
    ["Olivia Brown", "GB", "INDIVIDUAL"],
    ["Ethan Wilson", "US", "INDIVIDUAL"],
    ["Fatima Al-Thani", "QA", "INDIVIDUAL"],
    ["Jae-won Park", "KR", "INDIVIDUAL"],
    ["Sanjay Wickramasinghe", "US", "INDIVIDUAL"],
  ];
  const donors: Awaited<ReturnType<typeof db.donor.create>>[] = [];
  for (const [i, [fullName, country, donorType, companyName]] of donorSeeds.entries()) {
    const email = `${fullName.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "")}@example.com`;
    donors.push(
      await db.donor.create({
        data: {
          fullName, country, donorType, companyName, email, isDemo: true,
          publicProfile: i % 3 !== 2, showTotals: i % 4 === 0,
          userId: i === 0 ? donorUser.id : undefined,
        },
      }),
    );
  }

  const messages = [
    "Wishing every child a bright future.",
    "From Minnesota with love.",
    "Proud to support this community.",
    "Keep up the wonderful work!",
    "In memory of my grandmother, who loved Sri Lanka.",
    "Small help, big hearts.",
    "",
    "",
    "",
  ];

  type Created = Awaited<ReturnType<typeof db.project.create>>;

  async function addDonation(project: Created | null, cents: number, opts: { daysAgo: number; itemId?: string; qty?: number; method?: string; donorIdx?: number; status?: string } ) {
    const donor = opts.donorIdx !== undefined ? donors[opts.donorIdx] : pick(donors);
    const method = opts.method ?? (rand() < 0.8 ? "SANDBOX" : "BANK_TRANSFER");
    const f = method === "SANDBOX" ? fee(cents) : 0;
    const status = opts.status ?? "PAID";
    const anonymous = rand() < 0.15;
    const msg = pick(messages);
    const reference = nextRef();
    const created = daysAgo(opts.daysAgo);
    const d = await db.donation.create({
      data: {
        reference, idempotencyKey: `seed-${reference}`, donorId: donor.id, projectId: project?.id,
        budgetItemId: opts.itemId, itemQuantity: opts.qty, amountCents: cents, feeCents: status === "PAID" ? f : 0,
        originalAmount: cents, method, status, anonymous, showName: !anonymous, message: msg, messageApproved: !!msg,
        kind: opts.itemId ? "ITEM" : project ? (donor.donorType === "CORPORATE" ? "CORPORATE" : "PROJECT") : "GENERAL",
        isDemo: true, createdAt: created, confirmedAt: status === "PAID" ? created : null,
      },
    });
    if (status === "PAID") {
      await db.transaction.create({
        data: {
          donationId: d.id, gateway: method, providerRef: `seed_${reference}`, eventType: "payment.succeeded", status: "PAID",
          amountCents: cents, feeCents: f, netCents: cents - f, settlement: opts.daysAgo > 7 ? "SETTLED" : "UNSETTLED", createdAt: created,
        },
      });
      await db.ledgerEntry.create({ data: { type: "DONATION", amountCents: cents, projectId: project?.id, donationId: d.id, memo: `Donation ${reference} (demo)`, createdAt: created } });
      if (f) await db.ledgerEntry.create({ data: { type: "FEE", amountCents: -f, projectId: project?.id, donationId: d.id, memo: `Processing fee ${reference} (demo)`, createdAt: created } });
    }
    if (method === "BANK_TRANSFER") {
      await db.bankTransfer.create({
        data: { donationId: d.id, bankRef: `BT${Math.floor(rand() * 9e6 + 1e6)}`, status: status === "PAID" ? "VERIFIED" : "PENDING", verifiedBy: status === "PAID" ? finance.id : null, verifiedAt: status === "PAID" ? created : null },
      });
    }
    return d;
  }

  const AMOUNTS = [2500, 5000, 5000, 10000, 10000, 10000, 25000, 25000, 50000, 100000];
  async function fillDonations(project: Created, target: number, already: number, spanDays: number) {
    let remaining = target - already;
    while (remaining > 0) {
      let amt = pick(AMOUNTS);
      if (amt > remaining || remaining - amt < 2500) amt = remaining;
      await addDonation(project, amt, { daysAgo: Math.floor(rand() * spanDays) + 1 });
      remaining -= amt;
    }
  }

  const STANDARD_MILESTONES = [
    "Project identification", "Initial investigation", "Site visit", "Verification completed", "Budget approved",
    "Fundraising started", "Funding target reached", "Procurement started", "Project implementation",
    "Donation distribution", "Project completed", "Final report published",
  ];
  async function milestones(projectId: string, doneCount: number, startDaysAgo: number) {
    for (const [i, title] of STANDARD_MILESTONES.entries()) {
      const done = i < doneCount;
      await db.milestone.create({
        data: {
          projectId, title, sortOrder: i, done,
          date: done ? daysAgo(Math.max(1, startDaysAgo - i * Math.floor(startDaysAgo / 12))) : null,
          description: done ? `${title} recorded by the project team (demo).` : "",
        },
      });
    }
  }

  async function project(data: {
    slug: string; code: string; title: string; cat: string; short: string; status: string; priority?: string; featured?: boolean;
    location: string; district: string; goal: number; cover: string; gallery: [string, string][]; deadlineDays: number; publishedDaysAgo: number;
    beneficiaryType: string; families?: number; children?: number; students?: number; elderly?: number; direct: number; indirect: number;
    story: Partial<Record<"background" | "situation" | "problems" | "whyNeeded" | "objectives" | "solution" | "implementation" | "outcomes" | "longTermImpact" | "sustainability", string>>;
  }) {
    const p = await db.project.create({
      data: {
        slug: data.slug, code: data.code, title: data.title, categoryId: catId[data.cat], shortDescription: data.short,
        status: data.status, priority: data.priority ?? "NORMAL", featured: !!data.featured, isPublic: true, isDemo: true,
        location: data.location, district: data.district, goalCents: data.goal, costCents: data.goal, coverImage: P + data.cover,
        deadline: daysAhead(data.deadlineDays), publishedAt: daysAgo(data.publishedDaysAgo), startDate: daysAgo(data.publishedDaysAgo + 30),
        expectedCompletion: daysAhead(data.deadlineDays + 90),
        beneficiaryType: data.beneficiaryType, families: data.families ?? 0, children: data.children ?? 0, students: data.students ?? 0,
        elderly: data.elderly ?? 0, directBeneficiaries: data.direct, indirectBeneficiaries: data.indirect,
        verificationStatus: "VERIFIED", verificationDate: daysAgo(data.publishedDaysAgo + 5),
        verificationTeam: "MnSLFF Field Verification Team (demo)",
        verificationSummary: "Field officers visited the site, met community representatives and local officials, and confirmed the need and the budget estimates against local supplier quotations. (Demonstration record.)",
        siteVisit: `Site visit completed ${Math.max(10, data.publishedDaysAgo + 8)} days ago by two verification officers and the Grama Niladhari of the area. (Demonstration record.)`,
        seoTitle: `${data.title} | MnSLFF`, metaDescription: data.short,
        ...data.story,
      },
    });
    for (const [i, [img, stage]] of data.gallery.entries()) {
      await db.media.create({ data: { projectId: p.id, url: P + img, stage, sortOrder: i, caption: `${data.title} — ${stage.toLowerCase()} (demo photo)` } });
    }
    await db.projectDocument.create({ data: { projectId: p.id, title: "Verified project budget summary (demo)", url: "#", isPublic: true, kind: "SUPPORTING" } });
    await db.projectDocument.create({ data: { projectId: p.id, title: "Field verification report — internal", url: "#", isPublic: false, kind: "VERIFICATION" } });
    return p;
  }

  async function items(projectId: string, rows: [string, string, number, number][]) {
    const out = [];
    for (const [i, [name, description, quantity, unitCents]] of rows.entries()) {
      out.push(await db.budgetItem.create({ data: { projectId, name, description, quantity, unitCents, sortOrder: i } }));
    }
    return out;
  }

  async function sponsorItem(project: Created, item: { id: string; unitCents: number }, qty: number, d: number) {
    await addDonation(project, item.unitCents * qty, { daysAgo: d, itemId: item.id, qty });
    await db.budgetItem.update({ where: { id: item.id }, data: { fundedQty: { increment: qty } } });
    return item.unitCents * qty;
  }

  async function expense(projectId: string | null, title: string, category: string, cents: number, d: number, status = "PAID", administrative = false) {
    const e = await db.expense.create({
      data: { projectId, title, category, amountCents: cents, date: daysAgo(d), status, administrative, isDemo: true,
        description: `${title} (demonstration record).`, createdById: officer.id, approvedById: status !== "PENDING" ? finance.id : null },
    });
    if (status === "PAID") await db.ledgerEntry.create({ data: { type: "EXPENSE", amountCents: -cents, projectId, expenseId: e.id, memo: `Expense paid: ${title} (demo)`, createdAt: daysAgo(d) } });
  }

  const commonStory = (what: string, where: string) => ({
    background: `${where} is a rural community where many families depend on seasonal farming and daily-wage work. ${what}`,
    situation: "Household incomes have fallen sharply with rising living costs, and families have little left after meeting basic food needs.",
    problems: "Limited public funding, long distances to services, and the lingering effects of past disasters leave essential needs unmet.",
    whyNeeded: "Without outside support the community cannot raise the funds needed, and children and older people are affected most.",
    objectives: "Meet the verified need in full, with transparent purchasing and clear reporting to every donor.",
    solution: "MnSLFF will purchase materials from local suppliers at verified prices and work with community volunteers to deliver the project.",
    implementation: "Procurement begins as soon as funding allows. Field officers supervise delivery and publish photo updates at each milestone.",
    outcomes: "Safer, healthier conditions for the families involved and measurable improvement within the first year.",
    longTermImpact: "Better health, school attendance and stability help families build more secure futures.",
    sustainability: "A local committee takes ownership of maintenance, supported by follow-up visits for two years.",
  });

  // 1. School development — $5,000 / $3,250
  const school = await project({
    slug: "school-development-monaragala", code: "MNS-2026-001", title: "School Development Project — Monaragala (Demo)",
    cat: "school-development", short: "New desks, chairs, bags and a renovated classroom for a rural primary school of 100 students.",
    status: "FUNDRAISING", priority: "HIGH", featured: true, location: "Buttala, Monaragala", district: "Monaragala",
    goal: 500000, cover: "05-slk-lg.jpg", gallery: [["05-slk-lg.jpg", "BEFORE"], ["06-slk-lg.jpg", "VERIFICATION"], ["13-slk-lg.jpg", "BEFORE"], ["11-slk-lg.jpg", "VERIFICATION"]],
    deadlineDays: 45, publishedDaysAgo: 40, beneficiaryType: "Rural primary school", students: 100, children: 100, families: 80, direct: 100, indirect: 320,
    story: commonStory("The local primary school serves 100 children, many of whom sit on the floor or share broken desks.", "Buttala"),
  });
  const schoolItems = await items(school.id, [
    ["School desks", "Durable hardwood desks made by a local carpenter.", 30, 5000],
    ["School chairs", "Matching chairs for each desk.", 30, 3000],
    ["School bags", "Strong bags for every student.", 100, 1200],
    ["Stationery packs", "Exercise books, pens, pencils and a geometry set.", 100, 600],
    ["Classroom renovation", "Roof repair, paint and new windows for one classroom.", 1, 65000],
    ["Transportation", "Delivery of furniture and supplies to the school.", 1, 15000],
  ]);
  let s = 0;
  s += await sponsorItem(school, schoolItems[0], 10, 30);
  s += await sponsorItem(school, schoolItems[0], 8, 18);
  s += await sponsorItem(school, schoolItems[2], 50, 22);
  s += await sponsorItem(school, schoolItems[3], 100, 12);
  s += await sponsorItem(school, schoolItems[5], 1, 9);
  await fillDonations(school, 325000, s, 38);
  await milestones(school.id, 6, 70);

  // 2. Home for a family — $10,000 / $4,000
  const home = await project({
    slug: "build-a-home-hambantota", code: "MNS-2026-002", title: "Build a Home for a Family — Hambantota (Demo)",
    cat: "housing-development", short: "A safe two-room home for a family of five currently living under a temporary roof.",
    status: "FUNDRAISING", priority: "URGENT", featured: true, location: "Tissamaharama, Hambantota", district: "Hambantota",
    goal: 1000000, cover: "21-slk-lg.jpg", gallery: [["21-slk-lg.jpg", "BEFORE"], ["20-slk-lg.jpg", "BEFORE"], ["06-slk-lg.jpg", "VERIFICATION"]],
    deadlineDays: 20, publishedDaysAgo: 25, beneficiaryType: "Family", families: 1, children: 3, direct: 5, indirect: 25,
    story: commonStory("A family of five has lived under a patched tarpaulin roof since their house was damaged in a storm.", "Tissamaharama"),
  });
  await items(home.id, [
    ["Foundation and walls", "Cement, bricks and labour for the main structure.", 1, 420000],
    ["Roofing", "Roof timber and tiles.", 1, 210000],
    ["Doors and windows", "Secure doors and windows.", 6, 18000],
    ["Plumbing and sanitation", "Toilet, water connection and drainage.", 1, 120000],
    ["Electrical wiring", "Safe wiring and fittings.", 1, 62000],
    ["Labour and supervision", "Skilled labour and site supervision.", 1, 80000],
  ]);
  await fillDonations(home, 400000, 0, 24);
  await milestones(home.id, 6, 50);

  // 3. Food support — $2,500 / $1,800
  const food = await project({
    slug: "food-support-100-families-batticaloa", code: "MNS-2026-003", title: "Food Support for 100 Families — Batticaloa (Demo)",
    cat: "food-distribution", short: "One month of dry rations for 100 low-income families affected by recent flooding.",
    status: "FUNDRAISING", priority: "URGENT", featured: true, location: "Vakarai, Batticaloa", district: "Batticaloa",
    goal: 250000, cover: "07-slk-lg.jpg", gallery: [["07-slk-lg.jpg", "VERIFICATION"], ["12-slk-lg.jpg", "BEFORE"]],
    deadlineDays: 10, publishedDaysAgo: 14, beneficiaryType: "Families", families: 100, children: 160, elderly: 40, direct: 420, indirect: 900,
    story: commonStory("Recent flooding destroyed crops and stored food for many households.", "Vakarai"),
  });
  const foodItems = await items(food.id, [["Family dry-ration pack", "Rice, dhal, flour, oil, sugar, milk powder for one month.", 100, 2500]]);
  let f3 = await sponsorItem(food, foodItems[0], 20, 10);
  f3 += await sponsorItem(food, foodItems[0], 12, 6);
  await fillDonations(food, 180000, f3, 13);
  await milestones(food.id, 6, 30);

  // 4. Clean water — $8,000 / $5,600
  const water = await project({
    slug: "clean-water-rural-village-anuradhapura", code: "MNS-2026-004", title: "Clean Water for a Rural Village — Anuradhapura (Demo)",
    cat: "clean-water", short: "A deep tube well and filtration unit to give 60 families safe drinking water.",
    status: "FUNDRAISING", priority: "HIGH", featured: true, location: "Padaviya, Anuradhapura", district: "Anuradhapura",
    goal: 800000, cover: "22-slk-lg.jpg", gallery: [["22-slk-lg.jpg", "BEFORE"], ["04-slk-lg.jpg", "VERIFICATION"]],
    deadlineDays: 60, publishedDaysAgo: 50, beneficiaryType: "Village", families: 60, children: 85, elderly: 30, direct: 240, indirect: 600,
    story: commonStory("Families walk up to 3 km to collect water from a source linked to kidney disease in the region.", "Padaviya"),
  });
  await items(water.id, [
    ["Tube well drilling", "Deep tube well to a safe aquifer.", 1, 350000],
    ["RO filtration unit", "Community reverse-osmosis plant.", 1, 300000],
    ["Storage tank", "10,000-litre storage tank and stand.", 1, 90000],
    ["Distribution taps", "Public tap points around the village.", 6, 10000],
  ]);
  await fillDonations(water, 560000, 0, 48);
  await milestones(water.id, 6, 80);

  // 5. Medical — $3,000 / $3,000 (fully funded, in delivery)
  const medical = await project({
    slug: "medical-assistance-programme-galle", code: "MNS-2026-005", title: "Medical Assistance Programme — Galle (Demo)",
    cat: "medical-assistance", short: "Eye surgeries, spectacles and follow-up care for 40 low-income patients.",
    status: "FULLY_FUNDED", priority: "NORMAL", featured: false, location: "Hikkaduwa, Galle", district: "Galle",
    goal: 300000, cover: "14-slk-lg.jpg", gallery: [["14-slk-lg.jpg", "VERIFICATION"], ["09-slk-lg.jpg", "DURING"]],
    deadlineDays: -5, publishedDaysAgo: 75, beneficiaryType: "Patients", elderly: 28, direct: 40, indirect: 120,
    story: commonStory("Many older residents live with treatable cataracts because they cannot afford surgery.", "Hikkaduwa"),
  });
  await items(medical.id, [
    ["Cataract surgery", "Surgery and lens at a partner hospital.", 20, 11000],
    ["Spectacles", "Prescription spectacles.", 40, 1500],
    ["Transport and follow-up", "Patient transport and post-operative checks.", 1, 18000],
  ]);
  await fillDonations(medical, 300000, 0, 70);
  await milestones(medical.id, 9, 110);
  await expense(medical.id, "First 10 cataract surgeries", "Medical services", 110000, 12);
  await expense(medical.id, "Spectacles — first batch of 20", "Medical supplies", 30000, 8);
  await expense(medical.id, "Remaining 10 surgeries (scheduled)", "Medical services", 110000, 2, "APPROVED");

  // 6. Education sponsorship — $12,000 / $4,800
  const edu = await project({
    slug: "education-sponsorship-programme-badulla", code: "MNS-2026-006", title: "Education Sponsorship Programme — Badulla (Demo)",
    cat: "childrens-education", short: "A full year of school costs for 40 students from tea-estate families.",
    status: "FUNDRAISING", priority: "NORMAL", featured: true, location: "Haputale, Badulla", district: "Badulla",
    goal: 1200000, cover: "11-slk-lg.jpg", gallery: [["11-slk-lg.jpg", "BEFORE"], ["10-slk-lg.jpg", "VERIFICATION"], ["15-slk-lg.jpg", "BEFORE"]],
    deadlineDays: 120, publishedDaysAgo: 60, beneficiaryType: "Students", students: 40, children: 40, families: 38, direct: 40, indirect: 160,
    story: commonStory("Children from tea-estate families often leave school early to support household income.", "Haputale"),
  });
  const eduItems = await items(edu.id, [["Annual student sponsorship", "Tuition classes, uniforms, books, transport and a monthly meal allowance for one student for one year.", 40, 30000]]);
  const e6 = await sponsorItem(edu, eduItems[0], 6, 50) + (await sponsorItem(edu, eduItems[0], 4, 20));
  await fillDonations(edu, 480000, e6, 58);
  await milestones(edu.id, 6, 90);

  // 7. Completed — Community library renovation
  const library = await project({
    slug: "community-library-renovation-matara", code: "MNS-2025-014", title: "Community Library Renovation — Matara (Demo)",
    cat: "community-development", short: "Rebuilt shelving, reading tables and a solar-lit study room for a village library.",
    status: "COMPLETED", priority: "NORMAL", featured: false, location: "Dikwella, Matara", district: "Matara",
    goal: 400000, cover: "05-slk-lg.jpg", gallery: [["21-slk-lg.jpg", "BEFORE"], ["06-slk-lg.jpg", "DURING"], ["03-slk-lg.jpg", "DURING"], ["13-slk-lg.jpg", "DISTRIBUTION"], ["05-slk-lg.jpg", "AFTER"], ["04-slk-lg.jpg", "AFTER"]],
    deadlineDays: -120, publishedDaysAgo: 260, beneficiaryType: "Village community", children: 220, students: 180, families: 150, direct: 600, indirect: 1800,
    story: commonStory("The village library was badly damaged and had stood unused for years.", "Dikwella"),
  });
  await items(library.id, [
    ["Shelving and furniture", "Bookshelves, reading tables and chairs.", 1, 160000],
    ["Building repairs", "Roof, floor and window repairs.", 1, 170000],
    ["Solar lighting", "Solar panels and LED lighting for evening study.", 1, 70000],
  ]);
  await fillDonations(library, 412000, 0, 250);
  await db.project.update({
    where: { id: library.id },
    data: {
      completedAt: daysAgo(60), finalBeneficiaries: 640,
      outcome: "The library reopened with 2,000 donated books, a solar-lit evening study room and seating for 40 readers.",
      impactStatement: "Average daily visitors rose from zero to 65, and evening study sessions now support 120 O/L and A/L students. (Demonstration figures.)",
    },
  });
  await milestones(library.id, 12, 280);
  await expense(library.id, "Shelving and furniture", "Materials", 158000, 150);
  await expense(library.id, "Building repairs", "Construction", 167500, 130);
  await expense(library.id, "Solar lighting system", "Equipment", 69500, 100);

  // General fund donations
  for (let i = 0; i < 6; i++) await addDonation(null, pick([5000, 10000, 25000]), { daysAgo: Math.floor(rand() * 60) + 1 });

  // Pending, failed and refund examples
  await addDonation(water, 20000, { daysAgo: 1, method: "BANK_TRANSFER", status: "PENDING" });
  await addDonation(school, 10000, { daysAgo: 2, method: "BANK_TRANSFER", status: "PENDING" });
  await addDonation(home, 5000, { daysAgo: 3, method: "SANDBOX", status: "FAILED" });

  // Administrative expenses (general fund)
  await expense(null, "Website hosting and domain", "Administration", 18000, 40, "PAID", true);
  await expense(null, "Bank and transfer charges", "Administration", 6500, 20, "PAID", true);
  await expense(null, "Field verification travel", "Administration", 22000, 15, "PAID", true);

  // Project updates
  const updates: [string, string, string, string][] = [
    [school.id, "Verification complete and fundraising open", "Our field team visited the school with the principal and confirmed every item on the budget. Fundraising is now open. (Demo update.)", "06-slk-lg.jpg"],
    [school.id, "Half of the desks are now sponsored", "Thanks to item sponsors, 18 of 30 desks are funded. A local carpenter has been selected. (Demo update.)", "03-slk-lg.jpg"],
    [medical.id, "First ten surgeries completed", "Ten patients received cataract surgery this month and are recovering well. (Demo update.)", "09-slk-lg.jpg"],
    [library.id, "The library is open!", "The renovated library reopened with a small community celebration. (Demo update.)", "04-slk-lg.jpg"],
    [home.id, "Land and permits confirmed", "The family's land deed and local council approval were verified. (Demo update.)", "21-slk-lg.jpg"],
  ];
  for (const [projectId, title, body, img] of updates) {
    await db.projectUpdate.create({ data: { projectId, title, body, image: P + img, createdAt: daysAgo(Math.floor(rand() * 20) + 1) } });
  }

  // Testimonials (demo, approved, consented)
  const testimonials: [string, string, string, string][] = [
    ["Kumari (Demo)", "BENEFICIARY", "My children now study in a safe home. We are grateful to every person who helped.", "12-slk-lg.jpg"],
    ["Alex Morgan (Demo)", "DONOR", "I could see exactly where my money went — receipts, photos and the final report. That's rare.", "09-slk-lg.jpg"],
    ["Field Coordinator (Demo)", "COORDINATOR", "Every project is verified on site before a single dollar is raised. Donors deserve that certainty.", "07-slk-lg.jpg"],
    ["Volunteer (Demo)", "VOLUNTEER", "Handing over school bags to children who had none was a day I'll never forget.", "13-slk-lg.jpg"],
  ];
  for (const [name, role, quote, img] of testimonials) {
    await db.testimonial.create({ data: { name, role, quote, image: P + img, consent: true, approved: true, isDemo: true } });
  }

  // Assistance applications
  const apps: [string, string, string, string, number, number, string][] = [
    ["W. M. Senanayake (Demo)", "Kurunegala", "SCHOOL", "Rural school needs toilets and a water tank for 140 students.", 650000, 140, "UNDER_REVIEW"],
    ["R. Thevaraja (Demo)", "Jaffna", "HOUSING", "Widow with two children living in a damaged house.", 800000, 3, "SUBMITTED"],
    ["S. Kumarasinghe (Demo)", "Polonnaruwa", "MEDICAL", "Dialysis support for a father of three.", 250000, 5, "FIELD_VERIFICATION"],
  ];
  for (const [i, [applicantName, location, category, description, estimatedCents, beneficiaries, status]] of apps.entries()) {
    await db.application.create({
      data: { reference: `APP-DEMO${100 + i}`, applicantName, email: `applicant${i}@example.com`, location, category, description, estimatedCents, beneficiaries, status, consent: true },
    });
  }

  await db.notification.create({ data: { userId: null, title: "Demo data loaded", body: "The database contains demonstration records only." } });
  await db.notification.create({ data: { userId: donorUser.id, title: "Welcome to your donor portal", body: "Track your donations, receipts and project updates here." } });
  await db.savedProject.create({ data: { userId: donorUser.id, projectId: water.id } });
  await db.auditLog.create({ data: { userId: superAdmin.id, action: "seed", entity: "system", detail: "Demonstration data seeded" } });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
