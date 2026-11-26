import "server-only";
import { db } from "./db";
import { siteUrl } from "./site-url";
import { notifyAdmins, sendEmail } from "./audit";
import { receiptToken } from "./receipt-token";
import { usd } from "./format";

/** Side effects after a payment is confirmed (email, notifications). Never affects totals. */
export async function onDonationConfirmed(donationId: string) {
  const d = await db.donation.findUnique({ where: { id: donationId }, include: { donor: true, project: true, budgetItem: true } });
  if (!d) return;
  const site = await siteUrl();
  const receiptUrl = `${site}/api/receipts/${d.reference}?t=${receiptToken(d.reference)}`;
  await sendEmail(
    d.donor.email,
    `Thank you for your donation — ${d.reference}`,
    [
      `Dear ${d.donor.fullName},`,
      "",
      `Thank you for your gift of ${usd(d.amountCents)} to ${d.project?.title ?? "the MnSLFF General Fund"}.`,
      d.budgetItem ? `Item sponsored: ${d.itemQuantity} × ${d.budgetItem.name}` : "",
      `Reference: ${d.reference}`,
      `Download your receipt: ${receiptUrl}`,
      "",
      "With gratitude,",
      "Minnesota Sri Lanka Friendship Foundation",
    ].filter(Boolean).join("\n"),
  );
  await notifyAdmins("Donation received", `${usd(d.amountCents)} from ${d.donor.fullName} (${d.reference}) for ${d.project?.title ?? "General Fund"}`);
  if (d.donor.userId) {
    await db.notification.create({
      data: { userId: d.donor.userId, title: "Payment confirmed — receipt available", body: `Your ${usd(d.amountCents)} donation (${d.reference}) is confirmed.` },
    });
  }
}
